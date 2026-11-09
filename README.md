# SGCB · Sistema de Gestión de Cuenta Bancaria Simplificada

Aplicación full-stack **MERN** para la asignatura de **Ingeniería Web**. Permite consultar el saldo de una cuenta, realizar depósitos, retiros y transferencias entre cuentas, y auditar todos los movimientos en un historial cronológico. La interfaz se actualiza **inmediatamente** después de cada operación exitosa, sin recargar el navegador.

---

## Tabla de contenido

1. [Descripción general](#descripción-general)
2. [Tecnologías utilizadas](#tecnologías-utilizadas)
3. [Requisitos previos](#requisitos-previos)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Instalación paso a paso](#instalación-paso-a-paso)
6. [Variables de entorno](#variables-de-entorno)
7. [Carga de datos de prueba (seed)](#carga-de-datos-de-prueba-seed)
8. [Ejecución del sistema](#ejecución-del-sistema)
9. [API REST](#api-rest)
10. [Scripts disponibles](#scripts-disponibles)
11. [Pruebas manuales sugeridas](#pruebas-manuales-sugeridas)
12. [Solución de problemas](#solución-de-problemas)

---

## Descripción general

El sistema está compuesto por dos aplicaciones independientes:

- **`/server`**: API REST con Node.js, Express y Mongoose conectada a una instancia local de MongoDB.
- **`/client`**: Single Page Application (SPA) con React + Vite estilizada al 100% con Tailwind CSS.

### Funcionalidades principales

- Selección de cuenta activa desde la barra de navegación.
- Consulta de saldo formateado en **soles peruanos (PEN)**.
- Depósitos con incremento atómico del saldo.
- Retiros con validación estricta de monto positivo y fondos suficientes.
- Transferencias entre cuentas con débito, crédito y **compensación automática** ante fallos.
- Historial cronológico descendente con insignias por tipo de movimiento.
- Alertas dinámicas de éxito/error, loaders y actualización reactiva del estado.
- Auditoría completa de cada movimiento en la colección `transacciones`.

---

## Tecnologías utilizadas

| Capa | Tecnología |
|------|------------|
| Backend | Node.js, Express 4, Mongoose 8, CORS, dotenv |
| Base de datos | MongoDB local (standalone) |
| Frontend | React 18, Vite 5, Axios |
| Estilos | Tailwind CSS 3.4, PostCSS, Autoprefixer |
| Orquestación | concurrently (raíz del proyecto) |

---

## Requisitos previos

Antes de instalar el proyecto verifica que tengas:

1. **Node.js 18 o superior** y **npm 9 o superior**.
   ```bash
   node --version
   npm --version
   ```

2. **MongoDB** instalado y **en ejecución** en `127.0.0.1:27017`.
   - En Windows, el servicio suele llamarse `MongoDB`.
   - Verifica el servicio:
     ```powershell
     Get-Service MongoDB
     ```
   - Si no está corriendo:
     ```powershell
     Start-Service MongoDB
     ```

3. **Git** (opcional, para clonar el repositorio).

---

## Estructura del proyecto

```text
SGCB/
├─ .gitignore
├─ README.md
├─ instrucciones.md
├─ package.json                  # Scripts raíz (dev, seed, install:all)
├─ server/
│  ├─ package.json
│  ├─ .env                       # Variables locales (no se sube a Git)
│  ├─ .env.example               # Plantilla pública
│  ├─ config/
│  │  └─ db.js                   # Conexión robusta a MongoDB
│  ├─ models/
│  │  ├─ Cuenta.js               # Esquema de cuenta bancaria
│  │  └─ Transaccion.js          # Esquema de auditoría
│  ├─ controllers/
│  │  └─ cuentaController.js     # Lógica de negocio y atomicidad
│  ├─ routes/
│  │  └─ cuentaRoutes.js         # Mapeo de endpoints
│  ├─ scripts/
│  │  └─ seed.js                 # Inicialización de datos
│  └─ server.js                  # Punto de entrada de Express
└─ client/
   ├─ package.json
   ├─ vite.config.js             # Proxy /api -> http://localhost:5000
   ├─ tailwind.config.js
   ├─ postcss.config.js
   ├─ index.html
   ├─ .env.example
   └─ src/
      ├─ main.jsx
      ├─ index.css
      ├─ App.jsx                 # Orquestador global del estado
      ├─ services/api.js         # Capa Axios
      ├─ utils/format.js         # Formateo de moneda y fechas
      └─ components/
         ├─ Navbar.jsx
         ├─ SaldoCard.jsx
         ├─ FormOperacion.jsx
         └─ HistorialTransacciones.jsx
```

---

## Instalación paso a paso

> Ejecuta los comandos desde la raíz del proyecto (`SGCB/`).

### 1. Instalar dependencias de la raíz

```bash
npm install
```

Esto instala `concurrently`, necesario para levantar ambos servidores con un solo comando.

### 2. Instalar dependencias del backend y del frontend

```bash
npm run install:all
```

Equivale a:

```bash
npm install --prefix server
npm install --prefix client
```

### 3. Verificar las variables de entorno

El proyecto funciona con valores por defecto aunque no exista un archivo `.env`. Para personalizar la configuración, créalo a partir de la plantilla:

```bash
copy server\.env.example server\.env
```

En macOS/Linux:

```bash
cp server/.env.example server/.env
```

El frontend funciona sin `.env` porque usa el proxy de Vite. Si necesitas apuntar a otra URL de API, crea `client/.env` a partir de `client/.env.example`.

### 4. Inicializar la base de datos

```bash
npm run seed
```

---

## Variables de entorno

### Backend (`server/.env`)

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `PORT` | `5000` | Puerto de la API REST |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/sgcb` | Cadena de conexión a MongoDB |
| `CLIENT_URL` | `http://localhost:5173` | Origen permitido por CORS |
| `NODE_ENV` | `development` | Entorno de ejecución |

### Frontend (`client/.env`, opcional)

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `VITE_API_URL` | `/api` | URL base de la API (el proxy de Vite redirige a `:5000`) |

> **Importante:** los archivos `.env` están excluidos por `.gitignore`. Nunca subas credenciales reales al repositorio.

---

## Carga de datos de prueba (seed)

El script `server/scripts/seed.js`:

1. Limpia las colecciones `transacciones` y `cuentas`.
2. Inserta tres cuentas con saldos iniciales fijos.
3. Imprime en consola los IDs generados.

```bash
npm run seed
```

### Cuentas creadas

| Número | Titular | Saldo inicial |
|--------|---------|---------------|
| `CTA-001` | Ana Torres Quispe | S/ 1,500.00 |
| `CTA-002` | Luis Ramírez Salazar | S/ 850.50 |
| `CTA-003` | Carla Mendoza Rojas | S/ 3,200.75 |

> Si vuelves a ejecutar el seed, los IDs cambian y se borra el historial anterior. La UI obtiene las cuentas dinámicamente, por lo que no necesitas actualizar ningún ID a mano.

---

## Ejecución del sistema

### Opción A: ambos servidores a la vez (recomendado)

```bash
npm run dev
```

`concurrently` levanta:

- API REST: <http://localhost:5000>
- SPA React: <http://localhost:5173>

Para detener ambos procesos usa `Ctrl + C`.

### Opción B: servidores por separado

**Terminal 1 — backend:**

```bash
npm run dev:server
```

o, dentro de la carpeta:

```bash
cd server
npm run dev
```

**Terminal 2 — frontend:**

```bash
npm run dev:client
```

o, dentro de la carpeta:

```bash
cd client
npm run dev
```

### Verificación rápida

Abre <http://localhost:5000/api/health>. Deberías obtener:

```json
{
  "estado": "ok",
  "servicio": "SGCB API",
  "timestamp": "2026-11-09T..."
}
```

Luego abre <http://localhost:5173> y verifica que el selector del Navbar muestre las tres cuentas del seed.

---

## API REST

Base URL: `http://localhost:5000/api`

| Método | Endpoint | Body | Códigos de éxito | Errores esperados |
|--------|----------|------|------------------|-------------------|
| `GET` | `/cuenta` | — | `200` | `500` |
| `GET` | `/cuenta/:id` | — | `200` | `400`, `404`, `500` |
| `GET` | `/cuenta/:id/historial` | — | `200` | `400`, `404`, `500` |
| `POST` | `/cuenta/deposito` | `{ "cuentaId": "...", "monto": 100 }` | `201` | `400`, `404`, `500` |
| `POST` | `/cuenta/retiro` | `{ "cuentaId": "...", "monto": 50 }` | `201` | `400`, `404`, `500` |
| `POST` | `/cuenta/transferencia` | `{ "cuentaOrigenId": "...", "cuentaDestinoId": "...", "monto": 75 }` | `201` | `400`, `404`, `500` |
| `GET` | `/health` | — | `200` | — |

### Formato de error uniforme

```json
{
  "mensaje": "Fondos insuficientes para realizar el retiro.",
  "detalle": "..." 
}
```

El campo `detalle` solo aparece en `development`.

### Ejemplos con PowerShell

```powershell
# Listar cuentas
Invoke-RestMethod -Uri "http://localhost:5000/api/cuenta" -Method Get

# Depósito
Invoke-RestMethod -Uri "http://localhost:5000/api/cuenta/deposito" `
  -Method Post -ContentType "application/json" `
  -Body '{"cuentaId":"REEMPLAZA_CON_EL_ID","monto":100}'

# Retiro
Invoke-RestMethod -Uri "http://localhost:5000/api/cuenta/retiro" `
  -Method Post -ContentType "application/json" `
  -Body '{"cuentaId":"REEMPLAZA_CON_EL_ID","monto":50}'

# Transferencia
Invoke-RestMethod -Uri "http://localhost:5000/api/cuenta/transferencia" `
  -Method Post -ContentType "application/json" `
  -Body '{"cuentaOrigenId":"ID_ORIGEN","cuentaDestinoId":"ID_DESTINO","monto":75}'
```

### Ejemplos con curl

```bash
curl http://localhost:5000/api/cuenta

curl -X POST http://localhost:5000/api/cuenta/deposito \
  -H "Content-Type: application/json" \
  -d '{"cuentaId":"ID_DE_LA_CUENTA","monto":100}'
```

---

## Scripts disponibles

### Raíz

| Script | Descripción |
|--------|-------------|
| `npm run install:all` | Instala dependencias de `server` y `client` |
| `npm run dev` | Levanta backend y frontend en paralelo |
| `npm run dev:server` | Solo backend con nodemon |
| `npm run dev:client` | Solo frontend con Vite |
| `npm run seed` | Ejecuta el seed de MongoDB |
| `npm run start` | Backend en modo producción (`node server.js`) |
| `npm run build` | Compila el frontend para producción |

### Backend (`server/`)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Nodemon con recarga automática |
| `npm start` | Node en modo producción |
| `npm run seed` | Inicializa cuentas de prueba |

### Frontend (`client/`)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build optimizado en `dist/` |
| `npm run preview` | Sirve el build localmente |

---

## Pruebas manuales sugeridas

1. **Consulta de saldo:** selecciona `CTA-001` y verifica `S/ 1,500.00`.
2. **Depósito:** deposita `S/ 100.00` y comprueba que el saldo pasa a `S/ 1,600.00` sin recargar.
3. **Retiro exitoso:** retira `S/ 50.00` y verifica el nuevo saldo.
4. **Retiro sin fondos:** intenta retirar un monto mayor al saldo. Debe aparecer una alerta roja con `Fondos insuficientes...` y el saldo no cambia.
5. **Monto inválido:** envía `0`, `-10` o texto. La API responde `400`.
6. **Transferencia:** envía `S/ 200.00` de `CTA-001` a `CTA-002`. Cambia al selector a `CTA-002` y verifica el incremento y el movimiento "Transferencia recibida".
7. **Transferencia a la misma cuenta:** debe responder `400`.
8. **Transferencia a cuenta inexistente:** usa un ObjectId válido pero no registrado; debe responder `404`.
9. **Historial:** confirma que los movimientos aparecen del más reciente al más antiguo y con la insignia correcta.
10. **Persistencia:** recarga el navegador; el saldo y el historial deben mantenerse porque provienen de MongoDB.

---

## Solución de problemas

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| `[DB] Error de conexión a MongoDB` | El servicio MongoDB está detenido | `Start-Service MongoDB` (Windows) o inicia `mongod` |
| `EADDRINUSE` en el puerto 5000 | Otro proceso usa el puerto | Cambia `PORT` en `server/.env` o detén el proceso |
| `EADDRINUSE` en el puerto 5173 | Otro Vite está corriendo | Cierra el otro proceso o usa `npm run dev -- --port 5174` |
| La UI muestra "Sin cuentas disponibles" | No se ejecutó el seed | Ejecuta `npm run seed` y recarga |
| Error de CORS | `CLIENT_URL` no coincide con el origen del frontend | Ajusta `CLIENT_URL` en `server/.env` |
| `No se pudo conectar con el servidor` | La API no está levantada | Ejecuta `npm run dev:server` |
| El historial no se actualiza | El backend devolvió un error | Revisa la consola del servidor y la alerta de la UI |

---

## Notas de diseño

- **Atomicidad:** las operaciones usan filtros condicionales y pipelines de actualización en MongoDB. Como la instancia local es *standalone* (sin replica set), las transferencias aplican **compensación manual** si falla el crédito o el registro de auditoría.
- **Separación de responsabilidades:** las rutas solo mapean endpoints; los controladores concentran validaciones y reglas de negocio; los modelos definen la integridad de los datos.
- **Reactividad:** `App.jsx` centraliza el estado y refresca saldo e historial con `Promise.all` después de cada operación exitosa.
- **Tailwind CSS:** todos los estilos son clases utilitarias; no se usan hojas CSS por componente.

Para una explicación detallada del flujo de datos, la gestión de estado y el mapeo a la rúbrica, consulta [`instrucciones.md`](./instrucciones.md).
