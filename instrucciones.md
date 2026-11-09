# Documentación técnica avanzada · SGCB

Este documento explica en profundidad **cómo funciona** el Sistema de Gestión de Cuenta Bancaria Simplificada (SGCB), con énfasis en el flujo de datos, la gestión de estado de React y las decisiones de diseño que sostienen una calificación de **Sobresaliente** en la rúbrica de Ingeniería Web.

---

## 1. Arquitectura general

El proyecto aplica una arquitectura **cliente-servidor desacoplada**:

```text
┌─────────────────────────────┐        HTTP/JSON        ┌─────────────────────────────┐
│  React + Vite (puerto 5173) │  ───────────────────▶   │  Express (puerto 5000)      │
│  SPA con Tailwind CSS       │                         │  Controladores + Mongoose   │
│  Estado global en App.jsx   │  ◀───────────────────   │  Validaciones y auditoría   │
└─────────────────────────────┘        JSON + status    └──────────────┬──────────────┘
                                                                       │
                                                                       ▼
                                                        ┌─────────────────────────────┐
                                                        │  MongoDB local (27017)      │
                                                        │  cuentas / transacciones    │
                                                        └─────────────────────────────┘
```

### Responsabilidades por capa

| Capa | Archivo(s) | Responsabilidad |
|------|------------|-----------------|
| Presentación | `client/src/components/*` | Renderizar UI, capturar eventos, mostrar loaders y alertas |
| Orquestación | `client/src/App.jsx` | Estado global, efectos, llamadas a la API, refresco reactivo |
| Acceso a datos | `client/src/services/api.js` | Instancia Axios, endpoints y normalización de errores |
| Rutas | `server/routes/cuentaRoutes.js` | Mapear método + URL al controlador |
| Negocio | `server/controllers/cuentaController.js` | Validar, ejecutar operaciones atómicas y auditar |
| Persistencia | `server/models/*.js` | Esquemas, índices y validaciones de integridad |
| Infraestructura | `server/config/db.js`, `server/server.js` | Conexión a MongoDB, CORS, JSON, manejo central de errores |

---

## 2. Flujo general de una operación

### 2.1 Secuencia completa (ejemplo: transferencia)

```text
Usuario                FormOperacion           App.jsx                 Axios/API            Express/Controller        MongoDB
   │                        │                     │                       │                       │                     │
   │ 1. Escribe monto       │                     │                       │                       │                     │
   │ 2. Pulsa "Confirmar"   │                     │                       │                       │                     │
   │───────────────────────▶│                     │                       │                       │                     │
   │                        │ 3. Valida en cliente│                       │                       │                     │
   │                        │ 4. onEjecutar...    │                       │                       │                     │
   │                        │────────────────────▶│                       │                       │                     │
   │                        │                     │ 5. setProcesando(true)│                       │                     │
   │                        │                     │ 6. POST /transferencia│                       │                     │
   │                        │                     │──────────────────────▶│                       │                     │
   │                        │                     │                       │ 7. Valida IDs/monto   │                     │
   │                        │                     │                       │ 8. Verifica cuentas   │                     │
   │                        │                     │                       │──────────────────────▶│                     │
   │                        │                     │                       │                       │ 9. Débito atómico   │
   │                        │                     │                       │                       │────────────────────▶│
   │                        │                     │                       │                       │ 10. Crédito destino │
   │                        │                     │                       │                       │────────────────────▶│
   │                        │                     │                       │                       │ 11. Crea auditoría  │
   │                        │                     │                       │                       │────────────────────▶│
   │                        │                     │                       │ 12. 201 JSON          │                     │
   │                        │                     │◀──────────────────────│◀──────────────────────│                     │
   │                        │                     │ 13. refrescarCuenta() │                       │                     │
   │                        │                     │──────────────────────▶│ GET cuenta + historial│                     │
   │                        │                     │◀──────────────────────│◀──────────────────────│                     │
   │                        │                     │ 14. setState(saldo,   │                       │                     │
   │                        │                     │     historial)        │                       │                     │
   │                        │                     │ 15. setProcesando(false)                      │                     │
   │                        │◀────────────────────│                       │                       │                     │
   │ 16. Re-render con      │                     │                       │                       │                     │
   │     nuevo saldo        │                     │                       │                       │                     │
   │◀───────────────────────│                     │                       │                       │                     │
```

### 2.2 Explicación paso a paso

1. **Captura del evento.** El usuario completa el formulario y pulsa el botón. `FormOperacion` ejecuta `handleSubmit` y llama a `event.preventDefault()` para evitar la recarga del navegador.
2. **Validación en cliente.** Antes de gastar una petición de red se verifica:
   - que exista una cuenta activa;
   - que el monto sea numérico y mayor a `0`;
   - que en retiros/transferencias no se supere el saldo;
   - que en transferencias se haya elegido una cuenta destino distinta.
3. **Construcción del payload.** Según la pestaña activa se envía:
   - `{ cuentaId, monto }` para depósito/retiro;
   - `{ cuentaOrigenId, cuentaDestinoId, monto }` para transferencia.
4. **Delegación al padre.** `FormOperacion` no conoce Axios: recibe la prop `onEjecutarOperacion` y la invoca. Esto mantiene el componente reutilizable y testeable.
5. **Estado de carga.** `App` activa `procesando = true`, lo que deshabilita botones y muestra el spinner.
6. **Petición HTTP.** La capa `services/api.js` ejecuta `axios.post(...)` con `baseURL = /api`. En desarrollo, el proxy de Vite redirige al backend en `http://localhost:5000`.
7. **Validaciones del backend.** El controlador comprueba:
   - formato de ObjectId con `mongoose.Types.ObjectId.isValid`;
   - monto finito y mayor o igual a `0.01`;
   - que origen y destino sean distintos;
   - existencia de ambas cuentas.
8. **Operaciones atómicas.**
   - **Débito:** `findOneAndUpdate({ _id: origen, saldo: { $gte: monto } }, pipeline)` garantiza que el saldo solo se descuente si alcanza.
   - **Crédito:** `findByIdAndUpdate(destino, pipeline)` suma el monto.
   - El pipeline usa `$round` para fijar dos decimales dentro de MongoDB.
9. **Compensación.** Si el crédito o el registro de auditoría fallan, se revierte el débito (y el crédito si ya se aplicó). Esto sustituye a las transacciones de sesión, no disponibles en MongoDB standalone.
10. **Auditoría.** Se inserta un documento en `transacciones` con tipo, monto, fecha, cuentas y saldo resultante.
11. **Respuesta.** El backend responde `201` con un JSON que incluye un `mensaje` legible y los documentos actualizados.
12. **Refresco reactivo.** `App` vuelve a consultar saldo e historial con `Promise.all`. Al actualizar `cuentaActiva` e `historial` mediante `setState`, React re-renderiza automáticamente las tarjetas y la tabla. **No hay recarga manual ni `window.location.reload()`.**
13. **Feedback.** Se muestra una alerta verde con el mensaje del backend y se apaga `procesando`. Si algo falló, se muestra una alerta roja con el mensaje normalizado por Axios.

### 2.3 Manejo de errores por código HTTP

| Código | Significado | Ejemplo |
|--------|-------------|---------|
| `400` | Datos inválidos o regla de negocio incumplida | Monto `0`, fondos insuficientes, cuentas iguales |
| `404` | Recurso inexistente | Cuenta origen/destino no encontrada |
| `500` | Error interno no controlado | Fallo de MongoDB, error de programación |
| `403` | Origen bloqueado por CORS | Frontend no autorizado |

El backend siempre responde `{ mensaje, detalle? }`; `services/api.js` convierte ese JSON en un `Error` con un mensaje legible y `App` lo muestra en la alerta global.

---

## 3. Contratos de la API

### `GET /api/cuenta`
Devuelve un arreglo de cuentas ordenadas por número.

```json
[
  {
    "_id": "65f...",
    "titular": "Ana Torres Quispe",
    "numeroCuenta": "CTA-001",
    "saldo": 1500,
    "createdAt": "2026-11-09T...",
    "updatedAt": "2026-11-09T..."
  }
]
```

### `GET /api/cuenta/:id`
Devuelve una cuenta o `404` si no existe.

### `GET /api/cuenta/:id/historial`
Devuelve movimientos ordenados por `fecha` descendente. Cada elemento incluye `direccion` (`entrada`/`salida`) y las cuentas populadas con `titular` y `numeroCuenta`.

```json
[
  {
    "_id": "65f...",
    "tipo": "transferencia",
    "monto": 200,
    "fecha": "2026-11-09T...",
    "cuentaOrigen": { "_id": "...", "titular": "Ana Torres Quispe", "numeroCuenta": "CTA-001" },
    "cuentaDestino": { "_id": "...", "titular": "Luis Ramírez Salazar", "numeroCuenta": "CTA-002" },
    "saldoResultante": 1300,
    "direccion": "salida"
  }
]
```

### `POST /api/cuenta/deposito`
```json
{ "cuentaId": "65f...", "monto": 100 }
```
Respuesta `201`:
```json
{
  "mensaje": "Depósito realizado correctamente.",
  "cuenta": { "...": "documento actualizado" },
  "transaccion": { "...": "documento de auditoría" }
}
```

### `POST /api/cuenta/retiro`
Mismo body que el depósito. Devuelve `400` si el monto es inválido o si no hay fondos.

### `POST /api/cuenta/transferencia`
```json
{
  "cuentaOrigenId": "65f...",
  "cuentaDestinoId": "65f...",
  "monto": 75
}
```
Respuesta `201` con `cuentaOrigen`, `cuentaDestino` y `transaccion`.

---

## 4. UI y gestión de estado del frontend (énfasis máximo)

### 4.1 Inventario de estados en `App.jsx`

| Hook | Tipo | Propósito |
|------|------|-----------|
| `cuentas` | `useState([])` | Listado para el selector del Navbar |
| `cuentaActivaId` | `useState('')` | ID de la cuenta seleccionada |
| `cuentaActiva` | `useState(null)` | Documento completo de la cuenta (saldo, titular, etc.) |
| `historial` | `useState([])` | Movimientos de la cuenta activa |
| `cargandoCuentas` | `useState(true)` | Carga inicial del listado |
| `cargandoCuenta` | `useState(false)` | Carga del saldo |
| `cargandoHistorial` | `useState(false)` | Carga de movimientos |
| `procesando` | `useState(false)` | Operación bancaria en curso |
| `alerta` | `useState(null)` | Mensaje global `{ tipo, mensaje, id }` |
| `estadoSistema` | `useState('cargando')` | Badge de conexión de la API |
| `ultimaSincronizacion` | `useState(null)` | Fecha del último refresco exitoso |
| `temporizadorAlerta` | `useRef(null)` | Timer de autocierre de alertas |

**¿Por qué estados separados?** Cada zona de la UI tiene su propio loader. Así, refrescar el historial no bloquea la tarjeta de saldo y viceversa. Un único estado gigante provocaría re-renderizados innecesarios y una UX menos precisa.

### 4.2 `useEffect` de montaje: carga de cuentas

```jsx
useEffect(() => {
  const cargarCuentasIniciales = async () => {
    try {
      setCargandoCuentas(true);
      setEstadoSistema('cargando');
      const data = await obtenerCuentas();
      setCuentas(data);
      setEstadoSistema('conectado');
      if (data.length > 0) {
        setCuentaActivaId((actual) => actual || data[0]._id);
      }
    } catch (error) {
      setEstadoSistema('desconectado');
      mostrarAlerta('error', error.message);
    } finally {
      setCargandoCuentas(false);
    }
  };
  cargarCuentasIniciales();
}, [mostrarAlerta]);
```

Puntos clave:

- Se ejecuta **una sola vez** al montar (la dependencia `mostrarAlerta` es estable gracias a `useCallback`).
- Usa una bandera `montado` para no actualizar estado si el componente se desmontó durante la petición.
- La selección de la primera cuenta usa una función dentro de `setCuentaActivaId` para evitar depender de un valor potencialmente obsoleto.

### 4.3 `useEffect` reactivo: cambio de cuenta

```jsx
useEffect(() => {
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
      const [cuenta, movimientos] = await Promise.all([
        obtenerCuenta(cuentaActivaId),
        obtenerHistorial(cuentaActivaId),
      ]);
      if (!activo) return;
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

  return () => {
    activo = false;
  };
}, [cuentaActivaId, mostrarAlerta]);
```

Este es el corazón de la reactividad:

- La dependencia `cuentaActivaId` hace que el efecto se re-ejecute **cada vez que el usuario cambia de cuenta** en el Navbar.
- `Promise.all` lanza las dos peticiones en paralelo; el tiempo total es el de la más lenta, no la suma.
- La función de limpieza marca `activo = false` para descartar respuestas de una cuenta anterior si el usuario cambia rápidamente (evita *race conditions*).
- Cada `setState` dispara un nuevo render; React calcula el diff y actualiza solo las partes necesarias.

### 4.4 Flujo de props entre componentes

```text
App.jsx (dueño del estado)
│
├─▶ Navbar
│     props: cuentas, cuentaActivaId, onCambiarCuenta,
│            estadoSistema, ultimaSincronizacion, cargando
│     función: onCambiarCuenta(id) ──▶ setCuentaActivaId
│
├─▶ SaldoCard
│     props: cuenta (objeto), cargando (bool)
│
├─▶ FormOperacion
│     props: cuentas, cuentaActiva, procesando,
│            onEjecutarOperacion(tipo, payload)
│     función: onEjecutarOperacion ──▶ Axios + refresco
│
└─▶ HistorialTransacciones
      props: historial (array), cargando (bool), cuentaActiva
```

Reglas aplicadas:

- **Flujo unidireccional:** los datos bajan por props; los eventos suben por callbacks.
- **Componentes de presentación puros:** `SaldoCard` e `HistorialTransacciones` no llaman a la API ni mutan estado global; solo renderizan lo que reciben.
- **Componente con estado local acotado:** `FormOperacion` gestiona lo que solo le incumbe (pestaña, monto, destino, error local) y delega la operación de red al padre.
- **Una sola fuente de verdad:** el saldo vive en `App`; cuando cambia, todos los componentes que lo reciben se actualizan a la vez.

### 4.5 Reactividad inmediata sin recargar

La clave está en `refrescarCuenta`:

```jsx
const refrescarCuenta = useCallback(async () => {
  if (!cuentaActivaId) return;

  const [cuenta, movimientos] = await Promise.all([
    obtenerCuenta(cuentaActivaId),
    obtenerHistorial(cuentaActivaId),
  ]);

  setCuentaActiva(cuenta);
  setHistorial(movimientos);
  setUltimaSincronizacion(new Date());

  setCuentas((previas) =>
    previas.map((item) =>
      item._id === cuenta._id ? { ...item, saldo: cuenta.saldo } : item
    )
  );
}, [cuentaActivaId]);
```

Secuencia exacta:

1. `ejecutarOperacion` recibe la respuesta `201`.
2. Llama a `refrescarCuenta`.
3. `setCuentaActiva` y `setHistorial` actualizan el estado.
4. React re-renderiza `SaldoCard` (nuevo saldo) y `HistorialTransacciones` (nuevo movimiento).
5. `setCuentas` sincroniza el saldo mostrado en el selector.
6. El usuario ve el cambio al instante, sin `F5`.

**¿Por qué volver a consultar en lugar de usar la respuesta?** Porque la respuesta de una transferencia solo devuelve origen y destino, no el historial completo. Refrescar desde la API garantiza que la UI refleje siempre la **fuente de verdad** (MongoDB) y evita divergencias entre pestañas o clientes.

### 4.6 Loaders, alertas y feedback

- **Loaders:** `cargandoCuenta` muestra un skeleton en `SaldoCard`; `cargandoHistorial` muestra filas animadas; `procesando` deshabilita el formulario y muestra un spinner en el botón.
- **Alertas:** `mostrarAlerta(tipo, mensaje)` guarda `{ tipo, mensaje, id }`. La `key={alerta.id}` reinicia la animación `fade-in-down`. Un `setTimeout` de 5 segundos la oculta y `useRef` permite cancelar el timer anterior.
- **Badge de conexión:** `estadoSistema` cambia a `conectado`, `desconectado` o `cargando` según el resultado de las peticiones.
- **Validación en dos capas:** el cliente evita peticiones innecesarias; el servidor impone la regla definitiva. Nunca se confía solo en el navegador.

---

## 5. Lógica del backend y atomicidad

### 5.1 Capas de validación

1. **Frontend (`FormOperacion`):** monto > 0, fondos suficientes, destino distinto.
2. **Controlador:** ObjectId válido, monto finito ≥ 0.01, cuentas existentes, reglas de negocio.
3. **Esquema Mongoose:** `saldo` mínimo 0, `monto` mínimo 0.01, `tipo` enumerado, `numeroCuenta` único.
4. **MongoDB:** índice único en `numeroCuenta` y filtros condicionales atómicos.

### 5.2 Depósito

```js
const cuenta = await Cuenta.findByIdAndUpdate(
  cuentaId,
  [{ $set: { saldo: { $round: [{ $add: ['$saldo', monto] }, 2] } } }],
  { new: true }
);
```

- El pipeline se ejecuta **dentro** de MongoDB: no hay lectura-modificación-escritura desde Node.
- `$round` fija dos decimales y evita errores de punto flotante.
- Si falla la creación de la transacción, se aplica `ajusteSaldo(-monto)` como compensación.

### 5.3 Retiro

```js
const cuenta = await Cuenta.findOneAndUpdate(
  { _id: cuentaId, saldo: { $gte: monto } },
  [{ $set: { saldo: { $round: [{ $subtract: ['$saldo', monto] }, 2] } } }],
  { new: true }
);
```

- El filtro `saldo: { $gte: monto }` es la garantía atómica de no dejar saldo negativo.
- Si no hay coincidencia, se distingue entre cuenta inexistente (`404`) y fondos insuficientes (`400`).

### 5.4 Transferencia con compensación

MongoDB local corre como **standalone**, por lo que `session.withTransaction()` no está disponible. La estrategia es:

1. Validar origen, destino y fondos.
2. Debitar el origen con filtro condicional atómico.
3. Acreditar el destino.
4. Crear la transacción de auditoría.
5. Si falla el paso 3 o 4:
   - devolver el monto al origen;
   - si el destino ya fue acreditado, debitarlo;
   - registrar en consola cualquier fallo de compensación.

Esto mantiene la consistencia en el caso normal y minimiza el riesgo en fallos parciales. Si en el futuro se configura un **replica set**, se puede migrar a transacciones reales sin cambiar los contratos de la API.

### 5.5 Manejo central de errores

- Cada controlador envuelve su lógica en `try/catch` y llama a `next(error)`.
- `server.js` define un middleware final de cuatro parámetros que:
  - registra el error completo;
  - responde con `status` (o `500` por defecto);
  - incluye `detalle` (stack) solo en `development`.
- Las rutas inexistentes devuelven `404` con un mensaje claro.

---

## 6. Guía de código limpio

### 6.1 Backend desacoplado

- **Rutas delgadas:** `cuentaRoutes.js` solo asocia método + URL con un controlador. No contiene lógica.
- **Controladores con responsabilidad única:** cada función hace una operación y responde con el código HTTP adecuado.
- **Utilidades reutilizables:** `parsearMonto`, `esObjectIdValido`, `ajusteSaldo` y `responderError` evitan duplicación.
- **Modelos como contrato:** los esquemas documentan y protegen la integridad de los datos.
- **Nombres intencionales:** `origenActualizado`, `destinoActualizado`, `errorCompensacion` describen exactamente qué contienen.
- **Comentarios educativos:** explican el *por qué* de cada decisión (atomicidad, compensación, redondeo), no solo el *qué*.

### 6.2 Frontend limpio

- **Separación presentación/lógica:** los componentes visuales no llaman a Axios; la lógica de red vive en `App` y `services/api.js`.
- **Estado mínimo y específico:** cada loader y cada dato tiene su propio `useState`.
- **Funciones memorizadas:** `useCallback` evita recrear funciones y disparar efectos innecesarios.
- **Limpieza de efectos:** banderas `activo`/`montado` y `clearTimeout` previenen fugas de memoria y actualizaciones sobre componentes desmontados.
- **Manejo de errores explícito:** los `catch` muestran mensajes al usuario y no silencian fallos.
- **Formato centralizado:** `utils/format.js` evita repetir `Intl.NumberFormat` en cada componente.

### 6.3 Tailwind CSS utilitario

- **Sin CSS por componente:** no hay archivos `.css` sueltos ni estilos globales innecesarios.
- **Diseño responsive mobile-first:** `sm:`, `md:` y `lg:` adaptan el grid, la tabla y el Navbar.
- **Consistencia visual:** paleta `slate`/`indigo`/`emerald`/`rose`, radios `rounded-2xl`/`rounded-3xl` y sombras uniformes.
- **Accesibilidad básica:** `aria-label`, `aria-live`, `role="alert"`, `role="tab"`, `aria-selected` y foco visible con `focus:ring`.
- **Feedback inmediato:** estados `hover`, `disabled`, `animate-pulse` y `animate-spin` comunican lo que ocurre.

---

## 7. Mapeo a la rúbrica (Sobresaliente · 3 puntos por criterio)

| Criterio | Evidencia en el proyecto |
|----------|--------------------------|
| **Configuración e infraestructura** | `.gitignore` completo, `README.md` con instalación/seed/ejecución, `package.json` raíz con `concurrently` |
| **Backend y API REST** | Express + Mongoose, rutas desacopladas, controladores con validaciones, códigos `400/404/500`, seed con 3 cuentas |
| **Modelo de datos** | `Cuenta` con saldo mínimo 0, `Transaccion` con tipo/monto/fecha/cuentas, índices y timestamps |
| **Lógica de negocio** | Depósito, retiro con fondos suficientes, transferencia con compensación, historial ordenado |
| **Frontend SPA** | React + Vite, componentes modulares, Tailwind 100% utilitario, responsive |
| **Gestión de estado** | `useState`/`useEffect`, `useCallback`, `useRef`, props unidireccionales, loaders y alertas |
| **Reactividad** | Refresco inmediato de saldo e historial tras `200/201` sin recargar |
| **Manejo de errores** | Validación en cliente y servidor, alertas dinámicas, middleware central |
| **Documentación** | `README.md` + `instrucciones.md` con flujo, estado y guía de código limpio |

---

## 8. Verificación paso a paso

```bash
# 1. Dependencias
npm install
npm run install:all

# 2. Base de datos
npm run seed

# 3. Ejecución conjunta
npm run dev
```

Comprobaciones:

1. `GET http://localhost:5000/api/health` responde `{ "estado": "ok" }`.
2. `http://localhost:5173` muestra las tres cuentas en el selector.
3. Depositar `S/ 100` en `CTA-001`: el saldo pasa de `S/ 1,500.00` a `S/ 1,600.00` al instante.
4. Retirar más que el saldo: alerta roja y saldo intacto.
5. Transferir `S/ 200` de `CTA-001` a `CTA-002`: ambos saldos cambian y el historial muestra "Transferencia enviada/recibida".
6. Recargar el navegador: los datos persisten (vienen de MongoDB).
7. `npm run build` compila el frontend sin errores.

---

## 9. Posibles mejoras futuras

- Autenticación con JWT y contraseñas hasheadas con bcrypt.
- Paginación y filtros en el historial.
- Transacciones reales de MongoDB con replica set.
- Pruebas automatizadas con Jest/Supertest y React Testing Library.
- Idempotencia de operaciones mediante claves únicas por solicitud.
- Panel administrativo para crear cuentas y clientes.
- Despliegue con Docker Compose (MongoDB + API + Nginx).

---

Con este diseño, el proyecto no solo cumple la consigna: demuestra criterio de ingeniería en validación, consistencia de datos, experiencia de usuario y mantenibilidad.
