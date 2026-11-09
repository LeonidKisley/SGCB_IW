// ============================================================
// Modelo Transaccion
// ------------------------------------------------------------
// Actúa como libro de auditoría: cada depósito, retiro o
// transferencia genera un documento inmutable con el detalle
// del movimiento, las cuentas involucradas y el saldo resultante.
// ============================================================

import mongoose from 'mongoose';

const transaccionSchema = new mongoose.Schema(
  {
    // Tipo de operación realizada.
    tipo: {
      type: String,
      required: [true, 'El tipo de transacción es obligatorio.'],
      enum: {
        values: ['deposito', 'retiro', 'transferencia'],
        message: 'El tipo debe ser deposito, retiro o transferencia.',
      },
    },

    // Monto movilizado. Debe ser estrictamente positivo.
    monto: {
      type: Number,
      required: [true, 'El monto es obligatorio.'],
      min: [0.01, 'El monto debe ser mayor o igual a 0.01.'],
      validate: {
        validator: (valor) => Number.isFinite(valor),
        message: 'El monto debe ser un número válido.',
      },
    },

    // Fecha exacta del movimiento. Se indexa para ordenar el historial.
    fecha: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Cuenta que envía el dinero (null en un depósito).
    cuentaOrigen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cuenta',
      default: null,
    },

    // Cuenta que recibe el dinero (null en un retiro).
    cuentaDestino: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cuenta',
      default: null,
    },

    // Saldo de la cuenta principal después de aplicar la operación.
    // En depósitos/retiros es la cuenta afectada; en transferencias
    // representa el saldo resultante de la cuenta de origen.
    saldoResultante: {
      type: Number,
      default: null,
    },

    // Saldo resultante de la cuenta destino (solo en transferencias).
    // Permite que el historial de la cuenta receptora muestre su saldo real.
    saldoResultanteDestino: {
      type: Number,
      default: null,
    },

    // Texto descriptivo generado por el controlador para el historial.
    descripcion: {
      type: String,
      trim: true,
      default: '',
      maxlength: [160, 'La descripción no puede superar los 160 caracteres.'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índice compuesto para consultar el historial de una cuenta por fecha.
transaccionSchema.index({ fecha: -1, _id: -1 });

const Transaccion = mongoose.model('Transaccion', transaccionSchema);

export default Transaccion;
