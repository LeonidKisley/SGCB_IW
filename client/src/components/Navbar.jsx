// ============================================================
// Navbar
// ------------------------------------------------------------
// Barra superior con identidad del sistema, selector de cuenta
// activa y feedback visual del estado de la API (conectada,
// desconectada o cargando).
// ============================================================

import { formatearFecha } from '../utils/format';

// Configuración visual de cada estado posible del sistema.
const ESTADOS = {
  conectado: {
    texto: 'API conectada',
    contenedor: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    punto: 'bg-emerald-500',
  },
  desconectado: {
    texto: 'Sin conexión',
    contenedor: 'bg-rose-50 text-rose-700 ring-rose-200',
    punto: 'bg-rose-500',
  },
  cargando: {
    texto: 'Sincronizando',
    contenedor: 'bg-amber-50 text-amber-700 ring-amber-200',
    punto: 'bg-amber-500',
  },
};

function Navbar({
  cuentas,
  cuentaActivaId,
  onCambiarCuenta,
  estadoSistema,
  ultimaSincronizacion,
  cargando,
}) {
  // Si llega un estado desconocido, mostramos "cargando" por seguridad.
  const estado = ESTADOS[estadoSistema] || ESTADOS.cargando;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {/* Identidad del sistema */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            {/* Icono de institución bancaria */}
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 10h18" />
              <path d="M5 10V7l7-4 7 4v3" />
              <path d="M6 10v7" />
              <path d="M10 10v7" />
              <path d="M14 10v7" />
              <path d="M18 10v7" />
              <path d="M3 21h18" />
            </svg>
          </span>

          <div>
            <p className="text-sm font-bold leading-tight text-slate-900">
              SGCB
            </p>
            <p className="text-xs text-slate-500">
              Gestión de Cuenta Bancaria
            </p>
          </div>
        </div>

        {/* Controles: selector de cuenta y estado de la API */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="hidden whitespace-nowrap sm:inline">
              Cuenta activa
            </span>

            <select
              value={cuentaActivaId}
              onChange={(event) => onCambiarCuenta(event.target.value)}
              disabled={cargando || cuentas.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-64"
              aria-label="Seleccionar cuenta activa"
            >
              {/* Mientras no hay cuentas mostramos un aviso deshabilitado. */}
              {cuentas.length === 0 ? (
                <option value="">
                  {cargando ? 'Cargando cuentas...' : 'Sin cuentas disponibles'}
                </option>
              ) : (
                // Cada opción muestra número de cuenta y titular.
                cuentas.map((cuenta) => (
                  <option key={cuenta._id} value={cuenta._id}>
                    {cuenta.numeroCuenta} · {cuenta.titular}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="flex items-center gap-2">
            {/* Insignia de estado de la API */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${estado.contenedor}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${estado.punto} ${
                  estadoSistema === 'cargando' ? 'animate-pulse' : ''
                }`}
              />
              {estado.texto}
            </span>

            {/* Última sincronización exitosa */}
            <span className="hidden text-xs text-slate-400 md:inline">
              Sync: {ultimaSincronizacion ? formatearFecha(ultimaSincronizacion) : '—'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
