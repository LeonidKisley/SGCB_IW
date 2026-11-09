// ============================================================
// Configuración de Vite para la SPA de React
// ------------------------------------------------------------
// El proxy redirige /api hacia el backend en el puerto 5000,
// evitando problemas de CORS durante el desarrollo.
// ============================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Plugin oficial de React (Fast Refresh y JSX automático).
  plugins: [react()],

  server: {
    // Escucha en todas las interfaces (IPv4 e IPv6) para que
    // http://localhost:5173 funcione con cualquier navegador.
    host: true,

    // Puerto del servidor de desarrollo.
    port: 5173,

    // Proxy: toda petición que empiece por /api viaja al backend.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
