// ============================================================
// SaldoCard
// ------------------------------------------------------------
// Tarjeta de alto impacto visual que muestra el saldo actual
// formateado en soles (PEN), el titular y el número de cuenta.
// Incluye un skeleton mientras los datos están cargando.
// ============================================================

import { formatearFecha, formatearMoneda } from '../utils/format';

function SaldoCard({ cuenta, cargando }) {
  // ----------------------------------------------------------
  // Estado de carga: mostramos bloques animados (skeleton)
  // ----------------------------------------------------------
  if (cargando || !cuenta) {
    return (
      <section
        className="animate-pulse overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-6 shadow-tarjeta"
        aria-label="Cargando saldo de la cuenta"
      >
        <div className="h-3 w-28 rounded-full bg-white/20" />
        <div className="mt-6 h-10 w-48 rounded-xl bg-white/20" />
        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
          <div className="h-10 rounded-lg bg-white/10" />
          <div className="h-10 rounded-lg bg-white/10" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-6 text-white shadow-tarjeta">
      {/* Círculos decorativos de fondo (puramente estéticos) */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
          Saldo disponible
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
          PEN
        </span>
      </div>

      {/* Saldo formateado con Intl.NumberFormat (es-PE / PEN) */}
      <p className="relative mt-4 break-words text-4xl font-bold tracking-tight sm:text-5xl">
        {formatearMoneda(cuenta.saldo)}
      </p>

      <div className="relative mt-6 grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-indigo-200">
            Titular
          </p>
          <p className="mt-1 text-sm font-semibold">{cuenta.titular}</p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-indigo-200">
            Número de cuenta
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tracking-wider">
            {cuenta.numeroCuenta}
          </p>
        </div>
      </div>

      <p className="relative mt-5 text-xs text-indigo-200">
        Última actualización: {formatearFecha(cuenta.updatedAt)}
      </p>
    </section>
  );
}

export default SaldoCard;
