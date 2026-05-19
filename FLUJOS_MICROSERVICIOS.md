# Flujos de Microservicios — SpendIQ

## Estado de implementación

| Servicio          | Puerto | Estado       | Descripción                              |
|-------------------|--------|--------------|------------------------------------------|
| discovery-service | 8761   | ✅ Completo  | Eureka — registro de servicios           |
| api-gateway       | 8080   | ✅ Completo  | Enrutamiento + validación JWT            |
| auth-service      | 8081   | ✅ Completo  | Registro, login, perfil de usuario       |
| transaction-service | 8082 | ✅ Completo  | CRUD transacciones + publica en IBM MQ   |
| trading-service   | 8083   | ❌ Pendiente | Órdenes, portfolio, consume IBM MQ       |
| price-service     | 8084   | ✅ Completo  | Precios cripto en tiempo real (CoinGecko)|

---

## auth-service

### Flujo login / register

```
Frontend
  POST /auth/login  { email, password }
         │
         ▼
API Gateway  ──  sin filtro JWT (ruta pública)
         │
         ▼
AuthController  →  AuthService.login()
  1. userRepository.findByEmail()
  2. passwordEncoder.matches(plain, hash)  ← BCrypt
  3. generateToken(user)
     JWT payload: { sub: userId, email, nombre, rol }
     firmado con HMAC-SHA + jwtSecret
         │
         ▼
Frontend recibe: { token, user: { id, email, nombre, apellido, rol } }
```

### Flujo GET /auth/me (ruta protegida)

```
Frontend  Authorization: Bearer <token>
         │
         ▼
API Gateway  ──  JwtAuthFilter
  valida firma JWT
  inyecta X-User-Id, X-User-Email en headers
         │
         ▼
AuthController.me()  →  AuthService.getUser(userId)
  userRepository.findById(userId)
         │
         ▼
Frontend recibe: UserResponse { id, email, nombre, apellido, rol, saldoInicial }
```

---

## transaction-service

### Flujo POST /transactions

```
Frontend
  POST /transactions
  Authorization: Bearer <token>
  Body: { tipo, categoria, descripcion, cantidad, fecha }
         │
         ▼
API Gateway  ──  JwtAuthFilter
  valida JWT
  extrae userId del subject
  añade header X-User-Id: "uuid"
         │
         ▼
TransactionController.create()
  @RequestHeader("X-User-Id")   ← userId seguro (del gateway)
  @RequestBody TransactionRequest  ← Jackson deserializa JSON
         │
         ▼
TransactionRequest (DTO entrada)
  { tipo, categoria, descripcion, cantidad, fecha }
  ⚠ NO lleva userId — lo pone el gateway, no el frontend
         │
         ▼
TransactionService.create(userId, request)
  1. new TransactionEntity()
  2. entity.setUserId(userId)     ← del header
  3. entity.set*(request.get*())  ← del body
  4. transactionRepository.save(entity)
     Hibernate → INSERT INTO transactions (...)
     genera id UUID automáticamente
  5. new TransactionResponse(entity)
  6. transactionPublisher.publish(response)  ← IBM MQ (no bloqueante)
         │
         ▼
TransactionEntity (modelo / tabla BD)
  id, userId, tipo, categoria, descripcion, cantidad, fecha

TransactionResponse (DTO salida)
  { id, userId, tipo, categoria, descripcion, cantidad, fecha }
         │
         ▼
IBM MQ  ──  cola: TRANSACTION.CREATED
  JSON de TransactionResponse guardado en cola
  trading-service lo consumirá para actualizar balance
         │
         ▼
Frontend recibe: TransactionResponse con id generado
```

### Flujo GET /transactions/summary

```
GET /transactions/summary  +  X-User-Id (del gateway)
         │
         ▼
TransactionService.getSummary(userId)
  SELECT SUM(cantidad) WHERE userId AND tipo = 'INGRESO'
  SELECT SUM(cantidad) WHERE userId AND tipo = 'GASTO'
         │
         ▼
SummaryResponse { ingresos, gastos, balance = ingresos - gastos }
```

### Separación de capas

| Clase                | Capa          | Responsabilidad                        |
|----------------------|---------------|----------------------------------------|
| TransactionRequest   | DTO entrada   | Lo que manda el frontend               |
| TransactionEntity    | Modelo / BD   | Lo que Hibernate mapea a la tabla      |
| TransactionResponse  | DTO salida    | Lo que devuelves al frontend           |
| TransactionPublisher | Mensajería    | Publica evento en IBM MQ (fire & forget)|

---

---

## price-service

### Estructura (sin BD — precios en memoria)

```
dto/
  PriceResponse.java        { asset, priceUsd, updatedAt }
config/
  WebClientConfig.java      bean WebClient apuntando a CoinGecko
client/
  CoinGeckoClient.java      llama a la API REST de CoinGecko
service/
  PriceService.java         ConcurrentHashMap como caché + orquesta fetch/publish
scheduler/
  PriceScheduler.java       @Scheduled cada 30s → PriceService.fetchAndPublish()
messaging/
  PricePublisher.java       publica en cola PRICE.UPDATED (fire & forget)
controller/
  PriceController.java      GET /prices,  GET /prices/{asset}
```

### Flujo del scheduler (cada 30 segundos)

```
@Scheduled(fixedDelay = 30000)
PriceScheduler.fetchPrices()
         │
         ▼
PriceService.fetchAndPublish()
         │
         ▼
CoinGeckoClient.fetchPrices(["bitcoin","ethereum","solana","ripple"])
  WebClient GET https://api.coingecko.com/api/v3/simple/price
            ?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd
         │
  CoinGecko devuelve:
  { "bitcoin":{"usd":65000}, "ethereum":{"usd":3200}, ... }
         │
  Transforma a Map<String, Double>:
  { "bitcoin" -> 65000.0, "ethereum" -> 3200.0, ... }
         │
         ▼
Por cada asset:
  1. new PriceResponse(asset, price, LocalDateTime.now())
  2. cache.put(asset, response)       ← actualiza ConcurrentHashMap en memoria
  3. pricePublisher.publish(response) ← IBM MQ cola PRICE.UPDATED (no bloqueante)
```

### Flujo GET /prices

```
Frontend  GET /prices
         │
         ▼
API Gateway  ──  sin filtro JWT (ruta pública)
         │
         ▼
PriceController.getAll()
  priceService.getAll()  →  new ArrayList<>(cache.values())
         │
         ▼
Frontend recibe: [
  { asset:"bitcoin",  priceUsd:65000.0, updatedAt:"2024-..." },
  { asset:"ethereum", priceUsd:3200.0,  updatedAt:"2024-..." },
  ...
]
```

### Por qué no hay BD

Los precios se refrescan cada 30s — guardarlos en PostgreSQL no aporta nada
para el caso de uso de mostrar precio actual. El `ConcurrentHashMap` es
thread-safe (el scheduler y los requests HTTP van en hilos distintos).

---

## IBM MQ — Patrón de mensajería

```
transaction-service  ──publish──►  cola TRANSACTION.CREATED  ──consume──►  trading-service
price-service        ──publish──►  cola PRICE.UPDATED         ──consume──►  trading-service
```

**Por qué MQ y no HTTP directo:**
- El mensaje persiste aunque el consumidor esté caído
- Los servicios son autónomos — no se llaman entre sí
- Si MQ falla, la operación principal (guardar transacción) no falla

---

## Rutas del API Gateway

| Ruta                         | Servicio destino    | JWT requerido |
|------------------------------|---------------------|---------------|
| /auth/login, /auth/register  | auth-service        | No            |
| /auth/me                     | auth-service        | Sí            |
| /transactions/**             | transaction-service | Sí            |
| /orders/**, /portfolio/**    | trading-service     | Sí            |
| /assets/**                   | trading-service     | No            |
| /prices/**                   | price-service       | No            |
