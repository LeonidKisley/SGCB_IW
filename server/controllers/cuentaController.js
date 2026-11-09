// ============================================================
// Controlador de cuentas bancarias
// ------------------------------------------------------------
// Aquí vive TODA la lógica de negocio: validaciones, operaciones
// atómicas sobre MongoDB y creación de la auditoría (Transaccion).
// Las rutas solo delegan; el controlador lee req y responde res.
// ============================================================

import Cuenta from '../models/Cuenta.js';
import Transaccion from '../models/Transaccion.js';

// ------------------------------------------------------------
// Utilidades internas
// ------------------------------------------------------------

// Redondea a 2 decimales para trabajar con centavos sin arrastrar
// errores de punto flotante (por ejemplo 0.1 + 0.2).
const redondear2 = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

// Verifica que un string tenga exactamente el formato de ObjectId
// (24 caracteres hexadecimales). Evita CastError y responde 400 claro.
const esObjectIdValido = (id) =>
  typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

// Convierte el monto recibido a número y valida que sea finito y > 0.
// Devuelve null cuando el dato es inválido para responder 400.
const parsearMonto = (valorCrudo) => {
  // Number('') es 0, por eso validamos primero que no venga vacío.
  if (valorCrudo === undefined || valorCrudo === null || valorCrudo === '') {
    return null;
  }

  const monto = Number(valorCrudo);

  // Rechazamos NaN, Infinity y valores negativos o cero.
  if (!Number.isFinite(monto) || monto <= 0) return null;

  // Redondeamos a centavos y verificamos que el resultado sea válido.
  const montoRedondeado = redondear2(monto);
  return montoRedondeado >= 0.01 ? montoRedondeado : null;
};

// Construye una etapa de actualización con pipeline de MongoDB que
// suma/resta el delta y redondea el saldo a 2 decimales DENTRO de la BD.
// Al ejecutarse en el servidor de MongoDB, la operación es atómica.
const ajusteSaldo = (delta) => [
  {
    $set: {
      saldo: { $round: [{ $add: ['$saldo', delta] }, 2] },
    },
  },
];

// Respuesta de error uniforme para que el frontend siempre lea `mensaje`.
const responderError = (res, status, mensaje, detalle) =>
  res.status(status).json({ mensaje, ...(detalle ? { detalle } : {}) });

// ------------------------------------------------------------
// GET /api/cuenta
// Lista todas las cuentas (usada por el selector del frontend).
// ------------------------------------------------------------
export const listarCuentas = async (req, res, next) => {
  try {
    // .lean() devuelve objetos planos: más rápido y suficiente para la UI.
    const cuentas = await Cuenta.find().sort({ numeroCuenta: 1 }).lean();

    // 200: consulta exitosa.
    return res.status(200).json(cuentas);
  } catch (error) {
    // Delegamos al middleware central de errores (500 controlado).
    return next(error);
  }
};

// ------------------------------------------------------------
// GET /api/cuenta/:id
// Devuelve el detalle y saldo actual de una cuenta.
// ------------------------------------------------------------
export const obtenerCuenta = async (req, res, next) => {
  const { id } = req.params;

  // Validación temprana del formato del ID.
  if (!esObjectIdValido(id)) {
    return responderError(res, 400, 'El ID de la cuenta no es válido.');
  }

  try {
    const cuenta = await Cuenta.findById(id).lean();

    // 404: el ID es válido pero la cuenta no existe.
    if (!cuenta) {
      return responderError(res, 404, 'Cuenta no encontrada.');
    }

    // 200: cuenta encontrada.
    return res.status(200).json(cuenta);
  } catch (error) {
    return next(error);
  }
};

// ------------------------------------------------------------
// POST /api/cuenta/deposito
// Incrementa el saldo y registra la transacción.
// ------------------------------------------------------------
export const depositar = async (req, res, next) => {
  // Extraemos los datos del cuerpo con desestructuración y valor seguro.
  const { cuentaId, monto: montoCrudo } = req.body ?? {};

  // Validamos la cuenta antes de tocar la base de datos.
  if (!cuentaId || !esObjectIdValido(cuentaId)) {
    return responderError(res, 400, 'La cuenta de destino no es válida.');
  }

  // Validamos el monto con la utilidad compartida.
  const monto = parsearMonto(montoCrudo);
  if (monto === null) {
    return responderError(
      res,
      400,
      'El monto debe ser un número mayor o igual a 0.01.'
    );
  }

  try {
    // findByIdAndUpdate + pipeline: suma el monto de forma atómica.
    // { new: true } devuelve el documento ya actualizado.
    const cuenta = await Cuenta.findByIdAndUpdate(cuentaId, ajusteSaldo(monto), {
      new: true,
    });

    // Si no existe la cuenta, respondemos 404.
    if (!cuenta) {
      return responderError(res, 404, 'Cuenta no encontrada.');
    }

    let transaccion;

    try {
      // Registro de auditoría del depósito.
      transaccion = await Transaccion.create({
        tipo: 'deposito',
        monto,
        cuentaDestino: cuenta._id,
        saldoResultante: cuenta.saldo,
        descripcion: `Depósito en la cuenta ${cuenta.numeroCuenta}`,
      });
    } catch (errorRegistro) {
      // Compensación: si falla el registro, devolvemos el saldo a su estado
      // anterior para no dejar dinero "fantasma" sin respaldo contable.
      await Cuenta.findByIdAndUpdate(cuenta._id, ajusteSaldo(-monto));
      throw errorRegistro;
    }

    // 201: se creó un recurso (la transacción).
    return res.status(201).json({
      mensaje: 'Depósito realizado correctamente.',
      cuenta,
      transaccion,
    });
  } catch (error) {
    return next(error);
  }
};

// ------------------------------------------------------------
// POST /api/cuenta/retiro
// Valida monto positivo y fondos suficientes antes de debitar.
// ------------------------------------------------------------
export const retirar = async (req, res, next) => {
  const { cuentaId, monto: montoCrudo } = req.body ?? {};

  if (!cuentaId || !esObjectIdValido(cuentaId)) {
    return responderError(res, 400, 'La cuenta de origen no es válida.');
  }

  const monto = parsearMonto(montoCrudo);
  if (monto === null) {
    return responderError(
      res,
      400,
      'El monto debe ser un número mayor o igual a 0.01.'
    );
  }

  try {
    // Operación atómica y condicional:
    // el filtro { saldo: { $gte: monto } } garantiza que MongoDB solo
    // actualice si hay fondos suficientes, incluso con peticiones
    // concurrentes. Si no hay match, devuelve null.
    const cuenta = await Cuenta.findOneAndUpdate(
      { _id: cuentaId, saldo: { $gte: monto } },
      ajusteSaldo(-monto),
      { new: true }
    );

    if (!cuenta) {
      // Distinguimos si la cuenta no existe (404) o si no hay fondos (400).
      const existe = await Cuenta.exists({ _id: cuentaId });

      if (!existe) {
        return responderError(res, 404, 'Cuenta no encontrada.');
      }

      return responderError(
        res,
        400,
        'Fondos insuficientes para realizar el retiro.'
      );
    }

    let transaccion;

    try {
      transaccion = await Transaccion.create({
        tipo: 'retiro',
        monto,
        cuentaOrigen: cuenta._id,
        saldoResultante: cuenta.saldo,
        descripcion: `Retiro de la cuenta ${cuenta.numeroCuenta}`,
      });
    } catch (errorRegistro) {
      // Compensación: revertimos el débito si la auditoría no se pudo guardar.
      await Cuenta.findByIdAndUpdate(cuenta._id, ajusteSaldo(monto));
      throw errorRegistro;
    }

    return res.status(201).json({
      mensaje: 'Retiro realizado correctamente.',
      cuenta,
      transaccion,
    });
  } catch (error) {
    return next(error);
  }
};

// ------------------------------------------------------------
// POST /api/cuenta/transferencia
// Debita el origen, acredita el destino y registra el movimiento.
// MongoDB local (standalone) no soporta transacciones multi-documento,
// por eso usamos actualizaciones atómicas + compensación ante fallos.
// ------------------------------------------------------------
export const transferir = async (req, res, next) => {
  const {
    cuentaOrigenId,
    cuentaDestinoId,
    monto: montoCrudo,
  } = req.body ?? {};

  // Validaciones de formato y reglas de negocio previas a la BD.
  if (!cuentaOrigenId || !esObjectIdValido(cuentaOrigenId)) {
    return responderError(res, 400, 'La cuenta de origen no es válida.');
  }

  if (!cuentaDestinoId || !esObjectIdValido(cuentaDestinoId)) {
    return responderError(res, 400, 'La cuenta de destino no es válida.');
  }

  if (String(cuentaOrigenId) === String(cuentaDestinoId)) {
    return responderError(
      res,
      400,
      'La cuenta de origen y destino deben ser diferentes.'
    );
  }

  const monto = parsearMonto(montoCrudo);
  if (monto === null) {
    return responderError(
      res,
      400,
      'El monto debe ser un número mayor o igual a 0.01.'
    );
  }

  try {
    // Consultamos ambas cuentas en paralelo para reducir latencia.
    const [origen, destino] = await Promise.all([
      Cuenta.findById(cuentaOrigenId).lean(),
      Cuenta.findById(cuentaDestinoId).lean(),
    ]);

    if (!origen) {
      return responderError(res, 404, 'Cuenta de origen no encontrada.');
    }

    if (!destino) {
      return responderError(res, 404, 'Cuenta de destino no encontrada.');
    }

    // Validación temprana de fondos (la validación definitiva es el filtro).
    if (origen.saldo < monto) {
      return responderError(
        res,
        400,
        'Fondos insuficientes en la cuenta de origen.'
      );
    }

    // Débito atómico y condicional en la cuenta de origen.
    const origenActualizado = await Cuenta.findOneAndUpdate(
      { _id: origen._id, saldo: { $gte: monto } },
      ajusteSaldo(-monto),
      { new: true }
    );

    // Si otra petición consumió el saldo entre la lectura y el débito,
    // el filtro no encuentra coincidencia y respondemos 400.
    if (!origenActualizado) {
      return responderError(
        res,
        400,
        'Fondos insuficientes en la cuenta de origen.'
      );
    }

    let destinoActualizado = null;

    try {
      // Crédito atómico en la cuenta de destino.
      destinoActualizado = await Cuenta.findByIdAndUpdate(
        destino._id,
        ajusteSaldo(monto),
        { new: true }
      );

      if (!destinoActualizado) {
        throw new Error('No se pudo acreditar el monto en la cuenta destino.');
      }

      // Registro único de auditoría con ambas cuentas involucradas.
      const transaccion = await Transaccion.create({
        tipo: 'transferencia',
        monto,
        cuentaOrigen: origenActualizado._id,
        cuentaDestino: destinoActualizado._id,
        saldoResultante: origenActualizado.saldo,
        saldoResultanteDestino: destinoActualizado.saldo,
        descripcion: `Transferencia de ${origenActualizado.numeroCuenta} a ${destinoActualizado.numeroCuenta}`,
      });

      // 201: transferencia completada y auditada.
      return res.status(201).json({
        mensaje: 'Transferencia realizada correctamente.',
        cuentaOrigen: origenActualizado,
        cuentaDestino: destinoActualizado,
        transaccion,
      });
    } catch (errorOperacion) {
      // ------------------------------------------------------
      // Compensación (rollback manual):
      // 1. Devolvemos el dinero a la cuenta de origen.
      // 2. Si el destino ya había sido acreditado, lo debitamos.
      // Esto mantiene la consistencia cuando la BD no soporta
      // transacciones distribuidas de sesión.
      // ------------------------------------------------------
      try {
        await Cuenta.findByIdAndUpdate(origenActualizado._id, ajusteSaldo(monto));

        if (destinoActualizado) {
          await Cuenta.findByIdAndUpdate(
            destinoActualizado._id,
            ajusteSaldo(-monto)
          );
        }
      } catch (errorCompensacion) {
        // Si la compensación falla, lo registramos para revisión manual.
        console.error(
          `[COMPENSACIÓN] No se pudo revertir la transferencia: ${errorCompensacion.message}`
        );
      }

      // Relanzamos el error original para que el middleware responda 500.
      throw errorOperacion;
    }
  } catch (error) {
    return next(error);
  }
};

// ------------------------------------------------------------
// GET /api/cuenta/:id/historial
// Devuelve los movimientos de una cuenta ordenados por fecha desc.
// ------------------------------------------------------------
export const obtenerHistorial = async (req, res, next) => {
  const { id } = req.params;

  if (!esObjectIdValido(id)) {
    return responderError(res, 400, 'El ID de la cuenta no es válido.');
  }

  try {
    // Verificamos que la cuenta exista antes de buscar movimientos.
    const cuenta = await Cuenta.findById(id).lean();
    if (!cuenta) {
      return responderError(res, 404, 'Cuenta no encontrada.');
    }

    // Buscamos transacciones donde la cuenta sea origen O destino.
    const movimientos = await Transaccion.find({
      $or: [{ cuentaOrigen: id }, { cuentaDestino: id }],
    })
      // Orden cronológico descendente: lo más reciente primero.
      .sort({ fecha: -1, _id: -1 })
      // Reemplazamos los ObjectId por datos legibles del titular.
      .populate('cuentaOrigen', 'titular numeroCuenta')
      .populate('cuentaDestino', 'titular numeroCuenta')
      .lean();

    // Agregamos un campo calculado `direccion` para que la UI sepa
    // si el movimiento representa una entrada o una salida de dinero.
    const historial = movimientos.map((movimiento) => {
      const esOrigen =
        movimiento.cuentaOrigen?._id?.toString() === id.toString();

      let direccion;

      if (movimiento.tipo === 'deposito') {
        direccion = 'entrada';
      } else if (movimiento.tipo === 'retiro') {
        direccion = 'salida';
      } else {
        // En transferencias, si la cuenta consultada es el origen es salida.
        direccion = esOrigen ? 'salida' : 'entrada';
      }

      // En una transferencia recibida, el saldo histórico relevante es
      // el de la cuenta destino; en el resto, el de la cuenta afectada.
      const saldoVisible =
        movimiento.tipo === 'transferencia' && direccion === 'entrada'
          ? movimiento.saldoResultanteDestino
          : movimiento.saldoResultante;

      return { ...movimiento, direccion, saldoResultante: saldoVisible };
    });

    // 200: historial listo para renderizar.
    return res.status(200).json(historial);
  } catch (error) {
    return next(error);
  }
};
