// ============================================================
// Modelo Cuenta
// ------------------------------------------------------------
// Representa una cuenta bancaria. Las validaciones del esquema
// son la última línea de defensa: aunque el controlador ya valida,
// Mongoose impide guardar datos inconsistentes (por ejemplo,
// un saldo negativo) sin importar desde dónde se escriba.
// ============================================================

import mongoose from 'mongoose';

const cuentaSchema = new mongoose.Schema(
  {
    // Nombre completo del titular de la cuenta.
    titular: {
      type: String,
      required: [true, 'El titular de la cuenta es obligatorio.'],
      trim: true, // Elimina espacios al inicio y al final.
      minlength: [3, 'El titular debe tener al menos 3 caracteres.'],
      maxlength: [80, 'El titular no puede superar los 80 caracteres.'],
    },

    // Identificador legible de la cuenta (ejemplo: CTA-001).
    numeroCuenta: {
      type: String,
      required: [true, 'El número de cuenta es obligatorio.'],
      unique: true, // MongoDB crea un índice único para evitar duplicados.
      trim: true,
      uppercase: true, // Normaliza a mayúsculas antes de validar.
      match: [
        /^[A-Z]{3}-\d{3,10}$/,
        'El número de cuenta debe tener el formato CTA-001.',
      ],
    },

    // Saldo disponible en la cuenta, expresado en soles (PEN).
    saldo: {
      type: Number,
      required: [true, 'El saldo es obligatorio.'],
      default: 0,
      // Regla de negocio: una cuenta jamás puede quedar en negativo.
      min: [0, 'El saldo no puede ser negativo.'],
      validate: {
        // Number.isFinite rechaza NaN e Infinity.
        validator: (valor) => Number.isFinite(valor),
        message: 'El saldo debe ser un número válido.',
      },
    },
  },
  {
    // createdAt y updatedAt automáticos.
    timestamps: true,
    // Elimina el campo __v (versión interna de Mongoose) de las respuestas.
    versionKey: false,
  }
);

// Nota: la opción `unique: true` del campo numeroCuenta ya crea el índice.
// No lo declaramos dos veces para evitar la advertencia de Mongoose.

// Registramos el modelo con el nombre 'Cuenta' (colección: cuentas).
const Cuenta = mongoose.model('Cuenta', cuentaSchema);

export default Cuenta;
