# Migración Firebase → REST API

## Por qué se migró

El frontend usaba Firebase Firestore directamente para guardar transacciones.
Al introducir el backend de microservicios, Firebase quedó desconectado —
`firebase.js` fue eliminado y la app dejó de funcionar.

---

## Ficheros afectados

| Fichero | Cambio |
|---|---|
| `src/pages/Home.jsx` | Elimina imports Firebase, usa `transactionsStore.js` |
| `src/pages/Transacciones.jsx` | Reescritura completa sin Firebase |
| `src/config/transactionsStore.js` | Ya apuntaba a REST, sin cambios |
| `backend/transaction-service` | Añadido `PUT /transactions/{id}` |

---

## Mapeo de campos Firebase → REST API

| Firebase (anterior) | REST API (actual) | Notas |
|---|---|---|
| `concepto` | `descripcion` | Mismo dato, distinto nombre |
| `monto` (positivo/negativo) | `cantidad` (siempre positivo) | El signo lo da `tipo` |
| `tipo: "gasto"` | `tipo: "GASTO"` | Mayúsculas en el backend |
| `tipo: "ingreso"` | `tipo: "INGRESO"` | Mayúsculas en el backend |
| `userId` (enviado desde front) | — | El gateway lo inyecta del JWT |
| — | `categoria` | Campo nuevo obligatorio |

---

## Flujo de datos tras la migración

```
Home.jsx / Transacciones.jsx
         │
         ▼
transactionsStore.js         ← capa única de acceso a la API
  listTransacciones()    →  GET  /transactions
  addTransaccion()       →  POST /transactions
  updateTransaccion()    →  PUT  /transactions/{id}   ← añadido en esta migración
  deleteTransaccion()    →  DELETE /transactions/{id}
         │
         ▼
API Gateway (JWT → X-User-Id)
         │
         ▼
transaction-service
```

---

## Lógica de mapeo en los componentes

### Al cargar (API → componente)

```js
{
  id:             t.id,
  concepto:       t.descripcion,       // renombrado para display
  monto:          t.tipo === "GASTO"   // signo para display
                    ? -Math.abs(t.cantidad)
                    : t.cantidad,
  tipo:           t.tipo.toLowerCase(), // "GASTO" → "gasto" para CSS
  categoria:      t.categoria,
  fechaOriginal:  t.fecha,             // YYYY-MM-DD para el input date
}
```

### Al guardar (componente → API)

```js
{
  tipo:        nuevaTransaccion.tipo.toUpperCase(), // "gasto" → "GASTO"
  categoria:   nuevaTransaccion.categoria,
  descripcion: nuevaTransaccion.concepto.trim(),
  cantidad:    Math.abs(parseFloat(nuevaTransaccion.monto)), // siempre positivo
  fecha:       nuevaTransaccion.fecha,
}
// userId NO se envía — el gateway lo extrae del JWT automáticamente
```

---

## Nuevo campo: categoría

El backend requiere `categoria`. Se añadió un `<select>` al formulario en
ambas páginas con los valores del enum del backend:

`SALARIO · ALIMENTACION · VIVIENDA · TRANSPORTE · SALUD · OCIO · EDUCACION · OTROS`

Valor por defecto: `OTROS`

---

## Endpoint añadido al backend

`PUT /transactions/{id}` en `transaction-service`:
- Valida que la transacción pertenece al usuario (via `X-User-Id`)
- Actualiza solo los campos no nulos (patch parcial)
- Devuelve `TransactionResponse` con los datos actualizados
