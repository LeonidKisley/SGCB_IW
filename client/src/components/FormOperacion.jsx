// ============================================================
// FormOperacion
// ------------------------------------------------------------
// Formulario con pestañas para Depósito, Retiro y Transferencia.
// Maneja estados locales (monto, cuenta destino, error) y valida
// en el cliente antes de llamar a la API. La ejecución real se
// delega al padre mediante la prop onEjecutarOperacion.
// ============================================================

import { useEffect, useState } from 'react';
import { formatearMoneda } from '../utils/format';

// Definición declarativa de las pestañas disponibles.
const TABS = [
  {
    id: 'deposito',
    etiqueta: 'Depósito',
    descripcion: 'Ingresa dinero a la cuenta activa.',
  },
  {
    id: 'retiro',
    etiqueta: 'Retiro',
    descripcion: 'Extrae dinero validando el saldo disponible.',
  },
  {
    id: 'transferencia',
    etiqueta: 'Transferencia',
    descripcion: 'Envía dinero a otra cuenta del sistema.',
  },
];

// Etiqueta del botón según la operación seleccionada.
const ETIQUETA_BOTON = {
  deposito: 'Confirmar depósito',
  retiro: 'Confirmar retiro',
  transferencia: 'Confirmar transferencia',
};

function FormOperacion({
  cuentas,
  cuentaActiva,
  procesando,
  onEjecutarOperacion,
}) {
  // ----------------------------------------------------------
  // Estado local del formulario
  // ----------------------------------------------------------
  const [tab, setTab] = useState('deposito');
  const [monto, setMonto] = useState('');
  const [cuentaDestinoId, setCuentaDestinoId] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  // Al cambiar de cuenta activa limpiamos el formulario para evitar
  // enviar datos de la cuenta anterior.
  useEffect(() => {
    setMonto('');
    setCuentaDestinoId('');
    setErrorLocal('');
  }, [cuentaActiva?._id]);

  // Cuentas disponibles como destino (excluye la cuenta activa).
  const cuentasDestino = cuentas.filter(
    (cuenta) => cuenta._id !== cuentaActiva?._id
  );

  // Conversión y validación reactiva del monto.
  const montoNumerico = Number(monto);
  const montoValido = Number.isFinite(montoNumerico) && montoNumerico > 0;
  const saldoDisponible = cuentaActiva?.saldo ?? 0;
  const requiereFondos = tab === 'retiro' || tab === 'transferencia';
  const excedeSaldo =
    requiereFondos && montoValido && montoNumerico > saldoDisponible;

  // Descripción de la pestaña activa para mostrar ayuda contextual.
  const tabActiva = TABS.find((item) => item.id === tab) || TABS[0];

  // ----------------------------------------------------------
  // Envío del formulario
  // ----------------------------------------------------------
  const handleSubmit = async (event) => {
    // Evita que el navegador recargue la página.
    event.preventDefault();
    setErrorLocal('');

    // Validaciones en el cliente (el backend valida nuevamente).
    if (!cuentaActiva) {
      setErrorLocal('Selecciona una cuenta para operar.');
      return;
    }

    if (!montoValido) {
      setErrorLocal('Ingresa un monto numérico mayor a 0.');
      return;
    }

    if (excedeSaldo) {
      setErrorLocal('El monto supera el saldo disponible.');
      return;
    }

    if (tab === 'transferencia' && !cuentaDestinoId) {
      setErrorLocal('Selecciona la cuenta de destino.');
      return;
    }

    if (tab === 'transferencia' && cuentaDestinoId === cuentaActiva._id) {
      setErrorLocal('La cuenta destino debe ser distinta a la origen.');
      return;
    }

    // Construimos el payload exacto que espera cada endpoint.
    const payload =
      tab === 'transferencia'
        ? {
            cuentaOrigenId: cuentaActiva._id,
            cuentaDestinoId,
            monto: montoNumerico,
          }
        : {
            cuentaId: cuentaActiva._id,
            monto: montoNumerico,
          };

    try {
      // El padre ejecuta Axios, refresca el estado y muestra la alerta.
      await onEjecutarOperacion(tab, payload);

      // Si la promesa resolvió, la operación fue exitosa: limpiamos.
      setMonto('');
      setCuentaDestinoId('');
    } catch (error) {
      // El mensaje del backend ya se muestra como alerta global en App.jsx.
      // No duplicamos el error en la interfaz.
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Nueva operación</h2>
          <p className="text-xs text-slate-500">{tabActiva.descripcion}</p>
        </div>

        {/* Saldo de referencia para retiros y transferencias */}
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
          {formatearMoneda(saldoDisponible)}
        </span>
      </div>

      {/* ------------------------------------------------------
          Pestañas interactivas
      ------------------------------------------------------ */}
      <div
        className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1"
        role="tablist"
        aria-label="Tipo de operación"
      >
        {TABS.map((item) => {
          const activa = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activa}
              disabled={procesando}
              onClick={() => {
                setTab(item.id);
                setErrorLocal('');
              }}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition disabled:cursor-not-allowed sm:text-sm ${
                activa
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.etiqueta}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------
          Formulario
      ------------------------------------------------------ */}
      <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
        {/* Monto */}
        <div>
          <label
            htmlFor="monto"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Monto (PEN)
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">
              S/
            </span>
            <input
              id="monto"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(event) => {
                setMonto(event.target.value);
                setErrorLocal('');
              }}
              disabled={procesando}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Botones rápidos de monto */}
          <div className="mt-2 flex flex-wrap gap-2">
            {[10, 50, 100, 200].map((valor) => (
              <button
                key={valor}
                type="button"
                disabled={procesando}
                onClick={() => {
                  setMonto(String(valor));
                  setErrorLocal('');
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {formatearMoneda(valor)}
              </button>
            ))}
          </div>
        </div>

        {/* Cuenta destino: solo visible en transferencias */}
        {tab === 'transferencia' && (
          <div className="animate-fade-in">
            <label
              htmlFor="cuentaDestino"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Cuenta destino
            </label>

            <select
              id="cuentaDestino"
              value={cuentaDestinoId}
              onChange={(event) => {
                setCuentaDestinoId(event.target.value);
                setErrorLocal('');
              }}
              disabled={procesando}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Selecciona una cuenta...</option>

              {cuentasDestino.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.numeroCuenta} · {cuenta.titular}
                </option>
              ))}
            </select>

            {cuentasDestino.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No hay otras cuentas disponibles para transferir.
              </p>
            )}
          </div>
        )}

        {/* Error local de validación */}
        {errorLocal && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
          >
            {errorLocal}
          </p>
        )}

        {/* Botón de envío con loader integrado */}
        <button
          type="submit"
          disabled={procesando || !cuentaActiva}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {procesando && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {procesando ? 'Procesando...' : ETIQUETA_BOTON[tab]}
        </button>
      </form>
    </section>
  );
}

export default FormOperacion;
