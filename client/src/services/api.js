// ============================================================
// Capa de acceso a la API REST
// ------------------------------------------------------------
// Centraliza Axios para que los componentes no conozcan URLs
// ni detalles HTTP. Así el día de mañana solo se cambia aquí
// la dirección del backend.
// ============================================================

import axios from 'axios';

// Instancia reutilizable con configuración común.
const api = axios.create({
  // En desarrollo, Vite redirige /api al backend mediante proxy.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  // Tiempo máximo de espera por petición (10 segundos).
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Extrae un mensaje de error legible desde una respuesta de Axios.
 * @param {unknown} error Error capturado en el catch.
 * @returns {string} Mensaje listo para mostrar al usuario.
 */
export const extraerMensajeError = (error) => {
  // El backend siempre responde { mensaje, detalle? }.
  if (error?.response?.data?.mensaje) {
    return error.response.data.mensaje;
  }

  // Timeout configurado en Axios.
  if (error?.code === 'ECONNABORTED') {
    return 'La solicitud tardó demasiado. Verifica tu conexión.';
  }

  // La petición salió pero no hubo respuesta del servidor.
  if (error?.request) {
    return 'No se pudo conectar con el servidor. ¿Está activa la API?';
  }

  // Cualquier otro error (por ejemplo, uno lanzado manualmente).
  return error?.message || 'Ocurrió un error inesperado.';
};

/**
 * Ejecuta una petición y normaliza la respuesta/errores.
 * @param {Promise<import('axios').AxiosResponse>} peticion Promesa de Axios.
 * @returns {Promise<any>} Datos del cuerpo de la respuesta.
 */
const manejarPeticion = async (peticion) => {
  try {
    // Axios entrega { data, status, headers, ... }; solo usamos data.
    const { data } = await peticion;
    return data;
  } catch (error) {
    // Convertimos el error de Axios en un Error con mensaje entendible.
    throw new Error(extraerMensajeError(error));
  }
};

// ------------------------------------------------------------
// Endpoints expuestos a los componentes
// ------------------------------------------------------------

// Listado de cuentas para el selector del Navbar.
export const obtenerCuentas = () => manejarPeticion(api.get('/cuenta'));

// Saldo y datos de una cuenta específica.
export const obtenerCuenta = (id) =>
  manejarPeticion(api.get(`/cuenta/${id}`));

// Historial de movimientos de una cuenta.
export const obtenerHistorial = (id) =>
  manejarPeticion(api.get(`/cuenta/${id}/historial`));

// Operaciones bancarias.
export const realizarDeposito = (payload) =>
  manejarPeticion(api.post('/cuenta/deposito', payload));

export const realizarRetiro = (payload) =>
  manejarPeticion(api.post('/cuenta/retiro', payload));

export const realizarTransferencia = (payload) =>
  manejarPeticion(api.post('/cuenta/transferencia', payload));

export default api;
