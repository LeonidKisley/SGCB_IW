// ============================================================
// Configuración de la conexión a MongoDB con Mongoose
// ------------------------------------------------------------
// Este módulo encapsula la conexión para que tanto el servidor
// como el script de seed reutilicen exactamente la misma lógica.
// ============================================================

import mongoose from 'mongoose';

/**
 * Establece la conexión con MongoDB.
 *
 * - Usa MONGODB_URI del archivo .env.
 * - Si no existe, cae en un valor por defecto para desarrollo local.
 * - serverSelectionTimeoutMS evita que la app se quede colgada
 *   cuando el servicio de MongoDB está apagado.
 *
 * @returns {Promise<import('mongoose').Mongoose>} Conexión activa.
 */
export const connectDB = async () => {
  // Leemos la URI desde el entorno o usamos el valor local por defecto.
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sgcb';

  try {
    // mongoose.connect devuelve una promesa; esperamos a que resuelva.
    const conexion = await mongoose.connect(uri, {
      // Tiempo máximo para encontrar un servidor disponible (5 segundos).
      serverSelectionTimeoutMS: 5000,
    });

    // Feedback claro en consola con host y nombre de la base de datos.
    console.log(
      `[DB] MongoDB conectado -> host: ${conexion.connection.host} | base: ${conexion.connection.name}`
    );

    return conexion;
  } catch (error) {
    // Si no se puede conectar, mostramos el motivo real y detenemos el proceso.
    // Es preferible fallar rápido a dejar la API levantada sin base de datos.
    console.error(`[DB] Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// ------------------------------------------------------------
// Listeners de estado de la conexión
// ------------------------------------------------------------
// 'disconnected' se dispara si el servicio de MongoDB se cae.
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] Conexión perdida con MongoDB. Se intentará reconectar...');
});

// 'reconnected' confirma que Mongoose recuperó la conexión automáticamente.
mongoose.connection.on('reconnected', () => {
  console.log('[DB] Conexión restablecida con MongoDB.');
});

// 'error' captura errores posteriores a la conexión inicial.
mongoose.connection.on('error', (error) => {
  console.error(`[DB] Error en la conexión: ${error.message}`);
});

export default connectDB;
