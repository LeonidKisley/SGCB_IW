// ============================================================
// Utilidades de formato
// ------------------------------------------------------------
// Centralizan Intl para que todos los componentes muestren
// montos y fechas con el mismo formato (PEN / es-PE).
// ============================================================

// Formateador de moneda para soles peruanos.
const formatoMoneda = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Formateador de fecha y hora legible en español.
const formatoFecha = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Convierte un número en texto monetario: 1500 -> "S/ 1,500.00".
 * @param {number|string} valor Monto a formatear.
 * @returns {string} Monto formateado.
 */
export const formatearMoneda = (valor) => {
  // Number(valor) || 0 protege contra null, undefined o NaN.
  return formatoMoneda.format(Number(valor) || 0);
};

/**
 * Convierte una fecha ISO en texto legible.
 * @param {string|Date} fecha Fecha a formatear.
 * @returns {string} Fecha formateada o "—" si es inválida.
 */
export const formatearFecha = (fecha) => {
  if (!fecha) return '—';

  const fechaObjeto = new Date(fecha);

  // Si la fecha no es válida mostramos un guion para no romper la UI.
  if (Number.isNaN(fechaObjeto.getTime())) return '—';

  return formatoFecha.format(fechaObjeto);
};

/**
 * Devuelve el monto con signo según la dirección del movimiento.
 * @param {number} monto Monto de la transacción.
 * @param {'entrada'|'salida'} direccion Dirección del dinero.
 * @returns {string} Ejemplo: "+ S/ 50.00" o "- S/ 50.00".
 */
export const formatearMontoFirmado = (monto, direccion) => {
  const signo = direccion === 'salida' ? '-' : '+';
  return `${signo} ${formatearMoneda(monto)}`;
};
