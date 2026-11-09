// ============================================================
// Punto de entrada de la API REST (SGCB)
// ------------------------------------------------------------
// Configura middlewares de seguridad básicos, monta las rutas
// y arranca el servidor solo después de conectar con MongoDB.
// ============================================================

// Carga las variables de entorno definidas en server/.env.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import cuentaRoutes from './routes/cuentaRoutes.js';

// Creamos la aplicación de Express.
const app = express();

// Puerto configurable; 5000 por defecto en desarrollo.
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------
// Middlewares globales
// ------------------------------------------------------------

// Oculta la cabecera X-Powered-By para no revelar la tecnología.
app.disable('x-powered-by');

// Lista de orígenes permitidos (separados por coma en CLIENT_URL).
const origenesPermitidos = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

// CORS restringido: solo el frontend autorizado puede consumir la API.
app.use(
  cors({
    origin: (origin, callback) => {
      // Peticiones sin Origin (Postman, curl, proxy de Vite) son válidas.
      if (!origin || origenesPermitidos.includes(origin)) {
        return callback(null, true);
      }

      // Creamos un error con status 403 para el manejador central.
      const errorCors = new Error(`Origen no permitido por CORS: ${origin}`);
      errorCors.status = 403;
      return callback(errorCors);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Permite leer cuerpos JSON con un límite razonable (10 KB).
app.use(express.json({ limit: '10kb' }));

// Permite cuerpos enviados como formulario URL-encoded.
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------
// Rutas de la aplicación
// ------------------------------------------------------------

// Endpoint de salud para monitoreo y verificación rápida.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    estado: 'ok',
    servicio: 'SGCB API',
    timestamp: new Date().toISOString(),
  });
});

// Montamos el router de cuentas bajo /api/cuenta.
app.use('/api/cuenta', cuentaRoutes);

// ------------------------------------------------------------
// Manejo de rutas inexistentes (404)
// ------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ------------------------------------------------------------
// Middleware central de errores (siempre al final)
// ------------------------------------------------------------
// Express detecta este middleware por sus cuatro parámetros.
// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  // Registramos el error completo en consola para depuración.
  console.error(`[API ERROR] ${req.method} ${req.originalUrl}`);
  console.error(error);

  const status = error.status || 500;

  res.status(status).json({
    mensaje: error.message || 'Error interno del servidor.',
    // En desarrollo devolvemos el stack para facilitar el aprendizaje.
    ...(process.env.NODE_ENV === 'development' ? { detalle: error.stack } : {}),
  });
});

// ------------------------------------------------------------
// Arranque del servidor
// ------------------------------------------------------------
const iniciarServidor = async () => {
  // Primero aseguramos la conexión a MongoDB.
  await connectDB();

  // Después abrimos el puerto para escuchar peticiones.
  const servidor = app.listen(PORT, () => {
    console.log(`[API] Servidor escuchando en http://localhost:${PORT}`);
    console.log(`[API] Salud: http://localhost:${PORT}/api/health`);
  });

  // Cierre ordenado: al recibir Ctrl+C o SIGTERM cerramos HTTP y Mongo.
  const cerrar = (senal) => {
    console.log(`\n[API] Señal ${senal} recibida. Cerrando servidor...`);

    servidor.close(async () => {
      await mongoose.connection.close();
      console.log('[API] Conexiones cerradas correctamente.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => cerrar('SIGINT'));
  process.on('SIGTERM', () => cerrar('SIGTERM'));
};

// Ejecutamos el arranque y capturamos cualquier error inesperado.
iniciarServidor().catch((error) => {
  console.error(`[API] Error fatal al iniciar: ${error.message}`);
  process.exit(1);
});
