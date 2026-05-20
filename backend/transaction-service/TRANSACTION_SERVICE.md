# transaction-service

**Puerto:** 8082 | **BD:** `transactions_db` | **Cola:** `TRANSACTION.CREATED`

---

## Estructura

```
transaction-service/src/main/java/com/spendiq/transaction/
├── controller/  TransactionController   → endpoints REST
├── dto/         TransactionRequest      → lo que manda el frontend
│                TransactionResponse     → lo que devuelve la API
│                SummaryResponse         → totalIngresos, totalGastos, balance
├── entity/      TransactionEntity       → tabla transactions
├── messaging/   TransactionPublisher    → publica en Artemis (fire & forget)
├── repository/  TransactionRepository  → JPA + JPQL para sumas
└── service/     TransactionService     → lógica de negocio + CRUD
```

---

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/transactions` | Listar transacciones del usuario (orden fecha DESC) |
| POST | `/transactions` | Crear transacción |
| PUT | `/transactions/{id}` | Editar transacción (patch — solo campos no nulos) |
| DELETE | `/transactions/{id}` | Eliminar transacción |
| GET | `/transactions/summary` | Resumen: totalIngresos, totalGastos, balance |

Todas requieren JWT — el gateway inyecta `X-User-Id` en el header.

---

## Modelo — tabla `transactions`

| Campo | Tipo | Valores |
|---|---|---|
| id | UUID | auto-generado |
| userId | VARCHAR | viene de X-User-Id (no FK — microservicio aislado) |
| tipo | ENUM | `INGRESO`, `GASTO` |
| categoria | ENUM | `SALARIO`, `ALIMENTACION`, `VIVIENDA`, `TRANSPORTE`, `SALUD`, `OCIO`, `EDUCACION`, `OTROS` |
| descripcion | VARCHAR | texto libre |
| cantidad | DOUBLE | positivo siempre |
| fecha | TIMESTAMP | default NOW() |

---

## DTOs

### TransactionRequest (frontend → backend)
```json
{
  "tipo": "GASTO",
  "categoria": "ALIMENTACION",
  "descripcion": "Supermercado",
  "cantidad": 85.50,
  "fecha": "2026-05-20T10:00:00"
}
```

> **Mapeo frontend:** `concepto → descripcion`, `monto → cantidad`, `tipo.toUpperCase() → tipo`

---

## Mensajería — Artemis JMS

Al crear una transacción, `TransactionPublisher` publica en `TRANSACTION.CREATED` de forma asíncrona. Si el broker no está disponible, el error se loguea y la transacción se guarda igualmente.

---

## Flujo completo

```
Frontend → POST /transactions
  → API Gateway: valida JWT, inyecta X-User-Id
  → TransactionController: recoge userId + body
  → TransactionService.create(): guarda en PostgreSQL
  → TransactionPublisher: publica en Artemis (fire & forget)
  → devuelve TransactionResponse 200 OK
```

---

## Pruebas con curl

```bash
# Crear
curl -X POST http://localhost:8080/transactions \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tipo":"INGRESO","categoria":"SALARIO","descripcion":"Nómina mayo","cantidad":2000}'

# Listar
curl http://localhost:8080/transactions -H "Authorization: Bearer <TOKEN>"

# Resumen
curl http://localhost:8080/transactions/summary -H "Authorization: Bearer <TOKEN>"

# Editar
curl -X PUT http://localhost:8080/transactions/<ID> \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cantidad":2100}'

# Eliminar
curl -X DELETE http://localhost:8080/transactions/<ID> -H "Authorization: Bearer <TOKEN>"
```

---

## Pendiente

- `@Valid` + `@NotNull` + `@Positive` en TransactionRequest
- `GET /transactions/report/pdf` — informe mensual con iText
- `@ControllerAdvice` para manejo centralizado de errores
