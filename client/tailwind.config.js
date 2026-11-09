// ============================================================
// Configuración de Tailwind CSS v3
// ------------------------------------------------------------
// Definimos las rutas donde Tailwind buscará clases utilitarias
// y extendemos el tema con sombras y animaciones propias.
// ============================================================

/** @type {import('tailwindcss').Config} */
export default {
  // Archivos que Tailwind debe escanear para generar solo el CSS usado.
  content: ['./index.html', './src/**/*.{js,jsx}'],

  theme: {
    extend: {
      // Sombra suave reutilizada por las tarjetas principales.
      boxShadow: {
        tarjeta: '0 24px 60px -24px rgba(15, 23, 42, 0.45)',
      },

      // Animaciones personalizadas para alertas y contenido dinámico.
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.3s ease-out',
        'fade-in': 'fade-in 0.35s ease-out',
      },
    },
  },

  plugins: [],
};
