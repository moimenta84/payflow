# Transaction Service

Puerto: `8082` | BD: `transactions_db` | Cola IBM MQ: `TRANSACTION.CREATED`

---

## Flujo completo

### POST /transactions — Crear transacción

```
Frontend
  → manda JSON { tipo, categoria, descripcion, cantidad, fecha }
  → con header Authorization: Bearer <JWT>

API Gateway
  → valida el JWT
  → extrae el userId del subject del token
  → añade header X-User-Id: <userId>
  → redirige a transaction-service:8082

TransactionController
  → recoge X-User-Id del header (no toca el JWT)
  → deserializa el body a TransactionRequest
  → llama a transactionService.create(userId, request)

TransactionService
  → construye TransactionEntity con userId + datos del request
  → transactionRepository.save(entity) → INSERT en PostgreSQL
  → mapea la entidad guardada a TransactionResponse
  → transactionPublisher.publish(response) → mensaje JSON en cola IBM MQ
  → devuelve TransactionResponse

TransactionController
  → devuelve 200 OK + TransactionResponse
```

### GET /transactions — Historial

```
TransactionRepository.findByUserIdOrderByFechaDesc(userId)
  → SELECT * FROM transactions WHERE user_id = ? ORDER BY fecha DESC

Devuelve lista de TransactionResponse ordenada del más reciente al más antiguo
```

### GET /transactions/summary — Resumen del dashboard

```
Dos queries a PostgreSQL:
  SELECT SUM(cantidad) WHERE userId = ? AND tipo = 'INGRESO'
  SELECT SUM(cantidad) WHERE userId = ? AND tipo = 'GASTO'

Devuelve SummaryResponse:
  { totalIngresos, totalGastos, balance = ingresos - gastos }
```

### DELETE /transactions/{id}

```
Busca por id AND userId — un usuario no puede borrar transacciones ajenas
Si no existe → 500 (Transacción no encontrada)
Si existe    → DELETE + 204 No Content
```

---

## Estructura

```
entity/      TransactionEntity     → tabla transactions (id, userId, tipo, categoria, descripcion, cantidad, fecha)
dto/         TransactionRequest    → lo que manda el frontend
             TransactionResponse   → lo que devuelve la API
             SummaryResponse       → totalIngresos, totalGastos, balance
repository/  TransactionRepository → queries JPA + JPQL para la suma
service/     TransactionService    → lógica de negocio
controller/  TransactionController → endpoints REST
messaging/   TransactionPublisher  → publica en IBM MQ tras crear
```

---

## IBM MQ

Al crear una transacción se publica un mensaje JSON en la cola `TRANSACTION.CREATED`.

El `trading-service` consume esta cola para mantener actualizado el balance disponible
del usuario sin tener que consultar la BD del transaction-service directamente.
Esto es el patrón evento — cada servicio es autónomo y se comunican por mensajes.

---

## Categorías disponibles

| Categoría     | Tipo habitual |
|---------------|---------------|
| SALARIO       | INGRESO       |
| ALIMENTACION  | GASTO         |
| VIVIENDA      | GASTO         |
| TRANSPORTE    | GASTO         |
| SALUD         | GASTO         |
| OCIO          | GASTO         |
| EDUCACION     | GASTO         |
| OTROS         | ambos         |
