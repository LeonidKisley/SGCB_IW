# Trabajo Práctico: Sistema de Gestión de Cuenta Bancaria Simplificada

**Asignatura:** Ingeniería Web  
**Unidad:** Desarrollo Full-Stack (Node.js + React + MongoDB)

---

## 1. Descripción General
El propósito de esta actividad es diseñar y desarrollar una aplicación web *Full-Stack* para la gestión de una cuenta bancaria simple. Los estudiantes aplicarán conceptos fundamentales de frontend con React y arquitectura backend con Node.js, Express y MongoDB de manera local.

---

## 2. Arquitectura y Tecnologías Obligatorias

### Backend
* **Entorno de Ejecución:** Node.js
* **Framework Web:** Express.js
* **Lenguaje:** JavaScript (ES6+)
* **Base de Datos:** MongoDB local (Mongoose o driver nativo)

### Frontend
* **Framework / Bundler:** React empacado con Vite
* **Lenguaje y Sintaxis:** JavaScript y JSX
* **UI y Estado:** Componentes, Props, `useState` y `useEffect`
* **Estilos:** Tailwind CSS (integrado en Vite)

---

## 3. Requerimientos Funcionales

1. **Consulta de Saldo:** Mostrar el saldo actual del usuario en la pantalla principal. Debe actualizarse en la interfaz inmediatamente después de concretar cualquier transacción.
2. **Depósito de Fondos:** Permitir ingresar un monto positivo, aumentar el saldo de la cuenta y persistir la transacción en MongoDB.
3. **Retiro de Fondos:** Permitir retirar un monto determinado validando que no supere el saldo disponible (evitar saldos negativos).
4. **Transferencia entre Cuentas:** Permitir enviar dinero indicando cuenta destino y monto. Validar la existencia de la cuenta destino y la suficiencia de fondos en la origen. Actualizar ambos saldos atómicamente.
5. **Historial de Movimientos:** Mostrar una lista detallada con las últimas transacciones (tipo de operación, monto, fecha y cuentas origen/destino).

---

## 4. Requerimientos Técnicos y Estructura del Código

### Backend (API REST)
Implementar las siguientes rutas HTTP estandarizadas en Express:

* `GET /api/cuenta/:id` -> Obtiene saldo y datos de la cuenta.
* `POST /api/cuenta/deposito` -> Registra un depósito.
* `POST /api/cuenta/retiro` -> Registra un retiro.
* `POST /api/cuenta/transferencia` -> Registra la transferencia entre cuentas.
* `GET /api/cuenta/:id/historial` -> Obtiene el registro de transacciones.

> **Manejo de Respuestas HTTP:** Retornar código `400` para datos inválidos o saldo insuficiente, `404` para cuenta no encontrada y `500` para errores internos del servidor.

### Frontend (React + Vite)
* **Componentes:** Dividir la interfaz en componentes modulares (ej. `Navbar`, `SaldoCard`, `FormOperacion`, `HistorialTransacciones`).
* **JSX & Props:** Mantener una estructura limpia de maquetado y transferir datos/callbacks entre componentes padres e hijos.
* **State:** Controlar los inputs de formularios y sincronización dinámica mediante `useState` y `useEffect`.
* **Tailwind CSS:** Maquetado funcional, responsivo y moderno haciendo uso exclusivo de clases utilitarias de Tailwind.

---

## 5. Entregables

1. **Repositorio de Código (GitHub / GitLab):**
   * Estructura clara con carpetas independientes `/server` (backend) y `/client` (frontend).
   * Archivo `README.md` detallando requisitos de instalación, inicio de servidores y script *seed* para inicializar la BD con cuentas de prueba.
2. **Demostración Práctica:**
   * Exposición funcional del sistema en ejecución interactuando con la base de datos local MongoDB.

---

## 6. Formulario de Entrega del Repositorio
Una vez finalizado el desarrollo del proyecto y asegurada la visibilidad pública del código, deberá compartir la URL de su repositorio de GitHub a través del siguiente formulario oficial de entrega:

* **Registro de Entrega de Trabajo Práctico:** [Enviar URL del Repositorio en GitHub](https://forms.gle)

---

## 7. Rúbrica de Evaluación

| Criterio | Sobresaliente (3 pts) | Suficiente (2 pts) | En desarrollo (1 pt) | Insatisfactorio (0 pts) |
| :--- | :--- | :--- | :--- | :--- |
| **Backend & API REST** | Implementa controladores limpios, validaciones rigurosas, manejo atómico/seguro y conexión a MongoDB sin fallos. | Desarrolla las rutas requeridas y la conexión a MongoDB local de forma funcional, sin errores críticos. | Presenta fallos de validación (saldos negativos), falta alguna operación básica o sufre desconexiones. | No implementa la API REST, los endpoints no responden o no integra la base de datos MongoDB local. |
| **Arquitectura Frontend** | Código modular y desacoplado; excelente separación de vistas; paso de Props optimizado y JSX limpio. | Componentes organizados y funcionales; uso correcto de JSX y paso de Props fluido sin interrumpir la app. | Estructura monolítica con componentes sobrecargados; errores menores de JSX o mal manejo de Props. | No utiliza React con Vite o el proyecto no compila por errores graves de estructuración y sintaxis. |
| **Gestión del Estado** | Estado reactivo optimizado; integración de estados de carga/error; sincronización instantánea y fluida. | Maneja `useState` y `useEffect` adecuadamente; actualiza el saldo e historial sin requerir refresco manual. | Gestión ineficiente del estado; requiere recarga manual de pantalla o presenta desincronización. | No utiliza Hooks para la gestión del estado o la aplicación es incapaz de reaccionar al usuario. |
| **Diseño y Estilos** | Interfaz atractiva y 100% responsiva; uso avanzado de Tailwind con excelente retroalimentación visual. | Interfaz limpia, accesible y adaptativa; aplica Tailwind CSS correctamente en los componentes principales. | Uso parcial o desordenado de Tailwind; problemas de maquetación en pantallas chicas o estilos superpuestos. | No aplica Tailwind CSS o la interfaz gráfica es inoperable e inaccesible para el usuario. |
| **Documentación** | Repositorio impecable; `README.md` exhaustivo con variables de entorno y script *seed* automatizado avanzado. | Repositorio estructurado correctamente; `README.md` claro con pasos de ejecución y script *seed* funcional. | Falta el script *seed* o la documentación es confusa, dificultando el despliegue local del proyecto. | Repositorio desordenado o inexistente; sin archivo `README.md` ni instrucciones de ejecución. |

### Niveles de Desempeño Total
La evaluación consta de 5 criterios ponderados con un valor máximo de 3 puntos cada uno (Total: 15 puntos).
* **Sobresaliente (3 pts):** Cumple con excelencia y aporta mejoras adicionales o gran acabado visual/estructural.
* **Suficiente (2 pts):** Cumple con lo mínimo requerido de forma totalmente funcional sin errores críticos.
* **En desarrollo (1 pt):** Presenta fallos de validación, interfaz incompleta o errores de integración.
* **Insatisfactorio (0 pts):** No cumple la consigna, no implementa las tecnologías obligatorias o no ejecuta.
