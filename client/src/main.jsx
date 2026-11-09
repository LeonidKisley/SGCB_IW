// ============================================================
// Punto de entrada de la aplicación React
// ------------------------------------------------------------
// Monta el componente App dentro del div#root y carga los
// estilos globales generados por Tailwind CSS.
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// createRoot habilita el render concurrente de React 18.
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode ayuda a detectar efectos secundarios inseguros en desarrollo.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
