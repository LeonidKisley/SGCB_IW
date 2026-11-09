// ============================================================
// Script de inicialización (seed)
// ------------------------------------------------------------
// Limpia las colecciones de cuentas y transacciones e inserta
// tres cuentas de prueba con saldos iniciales fijos.
// Ejecutar con: npm run seed (desde /server o desde la raíz).
// ============================================================

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Cuenta from '../models/Cuenta.js';
import Transaccion from '../models/Transaccion.js';

// Datos de prueba con saldos fijos solicitados por la consigna.
const cuentasSemilla = [
  {
    titular: 'Ana Torres Quispe',
    numeroCuenta: 'CTA-001',
    saldo: 1500.0,
  },
  {
    titular: 'Luis Ramírez Salazar',
    numeroCuenta: 'CTA-002',
    saldo: 850.5,
  },
  {
    titular: 'Carla Mendoza Rojas',
    numeroCuenta: 'CTA-003',
    saldo: 3200.75,
  },
];

/**
 * Ejecuta el seed completo:
 * 1. Conecta a MongoDB.
 * 2. Elimina transacciones y cuentas previas.
 * 3. Inserta las cuentas de prueba.
 * 4. Muestra los IDs generados para usarlos en pruebas manuales.
 */
const ejecutarSeed = async () => {
  try {
    // Reutilizamos la misma conexión que usa la API.
    await connectDB();

    // Limpiamos primero las transacciones por la referencia a cuentas.
    await Transaccion.deleteMany({});
    console.log('[SEED] Colección de transacciones limpiada.');

    // Limpiamos las cuentas existentes para evitar duplicados.
    await Cuenta.deleteMany({});
    console.log('[SEED] Colección de cuentas limpiada.');

    // insertMany valida cada documento contra el esquema de Mongoose.
    const cuentas = await Cuenta.insertMany(cuentasSemilla);

    console.log(`[SEED] ${cuentas.length} cuentas insertadas correctamente:`);
    cuentas.forEach((cuenta) => {
      console.log(
        `  - ${cuenta.numeroCuenta} | ${cuenta.titular} | saldo: ${cuenta.saldo.toFixed(
          2
        )} | id: ${cuenta._id}`
      );
    });

    console.log(
      '[SEED] Proceso finalizado. Puedes usar el selector de la UI o estos IDs.'
    );
  } catch (error) {
    // Registramos el error y marcamos el proceso con código de salida 1.
    console.error(`[SEED] Error durante la inicialización: ${error.message}`);
    process.exitCode = 1;
  } finally {
    // Quitamos el listener de desconexión para que el cierre intencional
    // no se muestre como una advertencia en la consola.
    mongoose.connection.removeAllListeners('disconnected');

    // Cerramos la conexión para que el script termine limpiamente.
    await mongoose.connection.close();
    console.log('[SEED] Conexión con MongoDB cerrada.');
  }
};

// Ejecutamos el seed al invocar el archivo.
ejecutarSeed();
