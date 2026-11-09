// ============================================================
// HistorialTransacciones
// ------------------------------------------------------------
// Tabla responsive con los movimientos de la cuenta activa.
// Cada tipo de operación tiene una insignia (badge) de color:
//   - Depósito: verde
//   - Retiro: rojo
//   - Transferencia enviada: ámbar
//   - Transferencia recibida: azul
// ============================================================

import {
  formatearFecha,
  formatearMoneda,
  formatearMontoFirmado,
} from '../utils/format';

/**
 * Devuelve el texto y las clases de la insignia según el movimiento.
 * @param {object} movimiento Transacción enriquecida con `direccion`.
 * @returns {{texto: string, clase: string}}
 */
const obtenerBadge = (movimiento) => {
  if (movimiento.tipo === 'deposito') {
    return {
      texto: 'Depósito',
      clase: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    };
  }

  if (movimiento.tipo === 'retiro') {
    return {
      texto: 'Retiro',
      clase: 'bg-rose-50 text-rose-700 ring-rose-200',
    };
  }

  // Transferencias: el color depende de si el dinero entra o sale.
  return movimiento.direccion === 'entrada'
    ? {
        texto: 'Transferencia recibida',
        clase: 'bg-sky-50 text-sky-700 ring-sky-200',
      }
    : {
        texto: 'Transferencia enviada',
        clase: 'bg-amber-50 text-amber-700 ring-amber-200',
      };
};

/**
 * Genera una descripción legible de la contraparte del movimiento.
 * @param {object} movimiento Transacción con cuentas populadas.
 * @returns {string} Detalle para la columna "Detalle".
 */
const describirMovimiento = (movimiento) => {
  if (movimiento.tipo === 'deposito') {
    return 'Abono a la cuenta';
  }

  if (movimiento.tipo === 'retiro') {
    return 'Retiro de fondos';
  }

  if (movimiento.direccion === 'entrada') {
    const origen = movimiento.cuentaOrigen;
    return origen
      ? `Desde ${origen.numeroCuenta} · ${origen.titular}`
      : 'Transferencia recibida';
  }

  const destino = movimiento.cuentaDestino;
  return destino
    ? `Hacia ${destino.numeroCuenta} · ${destino.titular}`
    : 'Transferencia enviada';
};

function HistorialTransacciones({ historial, cargando, cuentaActiva }) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Encabezado con contexto de la cuenta */}
      <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Historial de movimientos
          </h2>
          <p className="text-xs text-slate-500">
            {cuentaActiva
              ? `Cuenta ${cuentaActiva.numeroCuenta} · ${cuentaActiva.titular}`
              : 'Selecciona una cuenta para ver sus movimientos'}
          </p>
        </div>

        <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {historial.length} registro(s)
        </span>
      </header>

      {/* ------------------------------------------------------
          Estado de carga: filas skeleton
      ------------------------------------------------------ */}
      {cargando && (
        <div className="space-y-3 p-5" aria-label="Cargando historial">
          {[0, 1, 2, 3].map((fila) => (
            <div
              key={fila}
              className="flex animate-pulse items-center gap-4 rounded-xl bg-slate-50 px-4 py-3"
            >
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="h-3 w-20 rounded-full bg-slate-200" />
              <div className="h-3 flex-1 rounded-full bg-slate-200" />
              <div className="h-3 w-16 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------
          Estado vacío
      ------------------------------------------------------ */}
      {!cargando && historial.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Todavía no hay movimientos
            </p>
            <p className="text-xs text-slate-500">
              Realiza un depósito, retiro o transferencia para verlos aquí.
            </p>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          Tabla de movimientos
      ------------------------------------------------------ */}
      {!cargando && historial.length > 0 && (
        <div className="flex-1 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Fecha
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Tipo
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Detalle
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-right font-semibold"
                >
                  Monto
                </th>
                <th
                  scope="col"
                  className="hidden px-5 py-3 text-right font-semibold sm:table-cell"
                >
                  Saldo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {historial.map((movimiento) => {
                const badge = obtenerBadge(movimiento);
                const esEntrada = movimiento.direccion === 'entrada';

                return (
                  <tr
                    key={movimiento._id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                      {formatearFecha(movimiento.fecha)}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${badge.clase}`}
                      >
                        {badge.texto}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-slate-600">
                      {describirMovimiento(movimiento)}
                    </td>

                    <td
                      className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${
                        esEntrada ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatearMontoFirmado(
                        movimiento.monto,
                        movimiento.direccion
                      )}
                    </td>

                    <td className="hidden whitespace-nowrap px-5 py-3 text-right text-xs text-slate-500 sm:table-cell">
                      {movimiento.saldoResultante != null
                        ? formatearMoneda(movimiento.saldoResultante)
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default HistorialTransacciones;
