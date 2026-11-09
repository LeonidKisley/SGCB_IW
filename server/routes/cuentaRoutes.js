// ============================================================
// Rutas de la API de cuentas
// ------------------------------------------------------------
// El router solo mapea URL + método HTTP hacia el controlador.
// Toda la lógica y los códigos de estado viven en el controlador.
// ============================================================

import { Router } from 'express';
import {
  listarCuentas,
  obtenerCuenta,
  obtenerHistorial,
  depositar,
  retirar,
  transferir,
} from '../controllers/cuentaController.js';

const router = Router();

// GET /api/cuenta -> listado de cuentas para el selector de la UI.
router.get('/', listarCuentas);

// GET /api/cuenta/:id -> saldo y datos de una cuenta.
router.get('/:id', obtenerCuenta);

// GET /api/cuenta/:id/historial -> movimientos ordenados por fecha desc.
router.get('/:id/historial', obtenerHistorial);

// POST /api/cuenta/deposito -> incrementa saldo y audita.
router.post('/deposito', depositar);

// POST /api/cuenta/retiro -> valida fondos, debita y audita.
router.post('/retiro', retirar);

// POST /api/cuenta/transferencia -> debita origen y acredita destino.
router.post('/transferencia', transferir);

export default router;
