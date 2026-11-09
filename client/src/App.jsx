// ============================================================
// App.jsx - Componente integrador principal
// ------------------------------------------------------------
// Orquesta todo el flujo global de la SPA:
//   1. Carga las cuentas y selecciona la primera.
//   2. Cada vez que cambia la cuenta activa, carga saldo e historial.
//   3. Ejecuta operaciones contra la API y refresca el estado
//      inmediatamente (sin recargar el navegador).
//   4. Centraliza las alertas de éxito/error y los estados de carga.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from './components/Navbar';
import SaldoCard from './components/SaldoCard';
import FormOperacion from './components/FormOperacion';
import HistorialTransacciones from './components/HistorialTransacciones';
import {
  obtenerCuentas,
  obtenerCuenta,
  obtenerHistorial,
  realizarDeposito,
  realizarRetiro,
  realizarTransferencia,
} from './services/api';

// Mapa que relaciona el tipo de operación con su función de API.
// Permite que `ejecutarOperacion` sea genérico y escalable.
const OPERACIONES = {
  deposito: realizarDeposito,
  retiro: realizarRetiro,
  transferencia: realizarTransferencia,
};

// Estilos visuales de las alertas globales.
const ESTILOS_ALERTA = {
  exito: {
    contenedor: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icono: 'text-emerald-500',
  },
  error: {
    contenedor: 'border-rose-200 bg-rose-50 text-rose-900',
    icono: 'text-rose-500',
  },
  info: {
    contenedor: 'border-sky-200 bg-sky-50 text-sky-900',
    icono: 'text-sky-500',
  },
};

/**
 * Alerta dinámica mostrada en la parte superior del panel.
 */
function Alertas({ alerta, onCerrar }) {
  if (!alerta) return null;

  const estilos = ESTILOS_ALERTA[alerta.tipo] || ESTILOS_ALERTA.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`mb-6 flex animate-fade-in-down items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${estilos.contenedor}`}
    >
      <span className={`mt-0.5 shrink-0 ${estilos.icono}`}>
        {alerta.tipo === 'exito' ? (
          // Icono de check para operaciones exitosas.
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          // Icono de advertencia para errores o avisos.
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        )}
      </span>

      <p className="flex-1 text-sm font-medium">{alerta.mensaje}</p>

      <button
        type="button"
        onClick={onCerrar}
        className="shrink-0 rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
        aria-label="Cerrar alerta"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

function App() {
  // ----------------------------------------------------------
  // Estado global de la aplicación
  // ----------------------------------------------------------
  const [cuentas, setCuentas] = useState([]);
  const [cuentaActivaId, setCuentaActivaId] = useState('');
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [historial, setHistorial] = useState([]);

  // Estados de carga independientes para cada zona de la interfaz.
  const [cargandoCuentas, setCargandoCuentas] = useState(true);
  const [cargandoCuenta, setCargandoCuenta] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Alertas y estado de conexión con la API.
  const [alerta, setAlerta] = useState(null);
  const [estadoSistema, setEstadoSistema] = useState('cargando');
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState(null);

  // Referencia al temporizador que oculta la alerta automáticamente.
  const temporizadorAlerta = useRef(null);

  // ----------------------------------------------------------
  // Utilidad para mostrar alertas con autocierre a los 5 segundos
  // ----------------------------------------------------------
  const mostrarAlerta = useCallback((tipo, mensaje) => {
    // Cancelamos cualquier temporizador anterior para evitar parpadeos.
    if (temporizadorAlerta.current) {
      clearTimeout(temporizadorAlerta.current);
    }

    setAlerta({ tipo, mensaje, id: Date.now() });

    temporizadorAlerta.current = setTimeout(() => {
      setAlerta(null);
    }, 5000);
  }, []);

  // Cierre manual: cancela el temporizador y oculta la alerta.
  const cerrarAlerta = useCallback(() => {
    if (temporizadorAlerta.current) {
      clearTimeout(temporizadorAlerta.current);
    }
    setAlerta(null);
  }, []);

  // Limpieza del temporizador al desmontar el componente.
  useEffect(() => {
    return () => {
      if (temporizadorAlerta.current) {
        clearTimeout(temporizadorAlerta.current);
      }
    };
  }, []);

  // ----------------------------------------------------------
  // Efecto 1: carga inicial del listado de cuentas
  // ----------------------------------------------------------
  useEffect(() => {
    let montado = true;

    const cargarCuentasIniciales = async () => {
      try {
        setCargandoCuentas(true);
        setEstadoSistema('cargando');

        const data = await obtenerCuentas();

        // Si el componente se desmontó, evitamos actualizar el estado.
        if (!montado) return;

        setCuentas(data);
        setEstadoSistema('conectado');

        // Seleccionamos la primera cuenta solo si aún no hay una activa.
        if (data.length > 0) {
          setCuentaActivaId((actual) => actual || data[0]._id);
        } else {
          mostrarAlerta(
            'info',
            'No hay cuentas registradas. Ejecuta "npm run seed" y recarga.'
          );
        }
      } catch (error) {
        if (!montado) return;
        setEstadoSistema('desconectado');
        mostrarAlerta('error', error.message);
      } finally {
        if (montado) setCargandoCuentas(false);
      }
    };

    cargarCuentasIniciales();

    // Bandera para evitar fugas de memoria en peticiones lentas.
    return () => {
      montado = false;
    };
  }, [mostrarAlerta]);

  // ----------------------------------------------------------
  // Efecto 2: carga saldo + historial al cambiar de cuenta
  // ----------------------------------------------------------
  useEffect(() => {
    // Si no hay cuenta seleccionada limpiamos la vista.
    if (!cuentaActivaId) {
      setCuentaActiva(null);
      setHistorial([]);
      return undefined;
    }

    let activo = true;

    const cargarDetalleCuenta = async () => {
      try {
        setCargandoCuenta(true);
        setCargandoHistorial(true);

        // Promise.all ejecuta ambas peticiones en paralelo (más rápido).
        const [cuenta, movimientos] = await Promise.all([
          obtenerCuenta(cuentaActivaId),
          obtenerHistorial(cuentaActivaId),
        ]);

        if (!activo) return;

        // Sincronizamos el estado: la UI se re-renderiza automáticamente.
        setCuentaActiva(cuenta);
        setHistorial(movimientos);
        setEstadoSistema('conectado');
        setUltimaSincronizacion(new Date());
      } catch (error) {
        if (!activo) return;
        setEstadoSistema('desconectado');
        mostrarAlerta('error', error.message);
      } finally {
        if (activo) {
          setCargandoCuenta(false);
          setCargandoHistorial(false);
        }
      }
    };

    cargarDetalleCuenta();

    // Al cambiar de cuenta se cancela la actualización del efecto anterior.
    return () => {
      activo = false;
    };
  }, [cuentaActivaId, mostrarAlerta]);

  // ----------------------------------------------------------
  // Refresco inmediato de saldo e historial (sin recargar página)
  // ----------------------------------------------------------
  const refrescarCuenta = useCallback(async () => {
    if (!cuentaActivaId) return;

    const [cuenta, movimientos] = await Promise.all([
      obtenerCuenta(cuentaActivaId),
      obtenerHistorial(cuentaActivaId),
    ]);

    setCuentaActiva(cuenta);
    setHistorial(movimientos);
    setUltimaSincronizacion(new Date());

    // Mantenemos sincronizado el saldo del selector del Navbar.
    setCuentas((previas) =>
      previas.map((item) =>
        item._id === cuenta._id ? { ...item, saldo: cuenta.saldo } : item
      )
    );
  }, [cuentaActivaId]);

  // ----------------------------------------------------------
  // Ejecución centralizada de operaciones bancarias
  // ----------------------------------------------------------
  const ejecutarOperacion = useCallback(
    async (tipo, payload) => {
      const peticion = OPERACIONES[tipo];

      if (!peticion) {
        throw new Error('Operación no soportada.');
      }

      setProcesando(true);

      try {
        // 1. Enviamos la operación al backend.
        const respuesta = await peticion(payload);

        // 2. Refrescamos saldo e historial desde la fuente de verdad.
        let mensaje = respuesta?.mensaje || 'Operación realizada correctamente.';

        try {
          await refrescarCuenta();
        } catch (errorRefresco) {
          // La operación sí se guardó; solo falló el refresco visual.
          mensaje = `${mensaje} No se pudo refrescar la vista; recarga la página.`;
        }

        // 3. Feedback exitoso en la parte superior.
        setEstadoSistema('conectado');
        mostrarAlerta('exito', mensaje);

        return respuesta;
      } catch (error) {
        // 4. Cualquier error (400, 404, 500 o red) se muestra al usuario.
        mostrarAlerta('error', error.message);
        throw error;
      } finally {
        // 5. Siempre liberamos el estado de "procesando".
        setProcesando(false);
      }
    },
    [refrescarCuenta, mostrarAlerta]
  );

  // ----------------------------------------------------------
  // Cambio de cuenta desde el Navbar
  // ----------------------------------------------------------
  const cambiarCuenta = useCallback((id) => {
    setCuentaActivaId(id);
    setCuentaActiva(null);
    setHistorial([]);
  }, []);

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50">
      <Navbar
        cuentas={cuentas}
        cuentaActivaId={cuentaActivaId}
        onCambiarCuenta={cambiarCuenta}
        estadoSistema={estadoSistema}
        ultimaSincronizacion={ultimaSincronizacion}
        cargando={cargandoCuentas}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Alerta global (éxito, error o información).
            La key reinicia la animación cada vez que llega una alerta nueva. */}
        <Alertas
          key={alerta?.id ?? 'sin-alerta'}
          alerta={alerta}
          onCerrar={cerrarAlerta}
        />

        {/* Aviso cuando el seed aún no se ha ejecutado */}
        {!cargandoCuentas && cuentas.length === 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No hay cuentas registradas. Ejecuta{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs font-semibold">
              npm run seed
            </code>{' '}
            en la raíz del proyecto y recarga esta página.
          </div>
        )}

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Panel de control
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta tu saldo, realiza operaciones y revisa tus movimientos en
            tiempo real.
          </p>
        </header>

        {/* Grid responsive: saldo/formulario a la izquierda, historial a la derecha */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-1">
            <SaldoCard cuenta={cuentaActiva} cargando={cargandoCuenta} />

            <FormOperacion
              cuentas={cuentas}
              cuentaActiva={cuentaActiva}
              procesando={procesando}
              onEjecutarOperacion={ejecutarOperacion}
            />
          </div>

          <div className="lg:col-span-2">
            <HistorialTransacciones
              historial={historial}
              cargando={cargandoHistorial}
              cuentaActiva={cuentaActiva}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
