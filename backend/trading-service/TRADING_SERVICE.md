# trading-service

Puerto **8083** · Base de datos `trading_db` (PostgreSQL) · Consume IBM MQ

## Responsabilidad

Gestiona la compra/venta de criptoactivos y mantiene el portfolio de cada usuario.
Recibe los precios en tiempo real desde `price-service` vía IBM MQ y actualiza
su propia tabla de activos, evitando llamadas HTTP síncronas entre servicios.

---

## Estructura de ficheros

```
entity/
  AssetEntity.java      tabla assets  — id=nombre activo, priceUsd, updatedAt
  OrderEntity.java      tabla orders  — id, userId, asset, tipo, cantidad, precioUnitario, total, fecha
  PortfolioEntry.java   tabla portfolio — userId + asset (unique), cantidad neta

dto/
  AssetResponse.java    { id, priceUsd, updatedAt }
  OrderRequest.java     { asset, tipo(COMPRA|VENTA), cantidad }
  OrderResponse.java    { id, userId, asset, tipo, cantidad, precioUnitario, total, fecha }
  PortfolioResponse.java { asset, cantidad, precioActual, valorTotal }

repository/
  AssetRepository       JpaRepository<AssetEntity, String>
  OrderRepository       findByUserIdOrderByFechaDesc
  PortfolioRepository   findByUserId / findByUserIdAndAsset

messaging/
  PriceConsumer         @JmsListener("PRICE.UPDATED")       → actualiza AssetEntity
  TransactionConsumer   @JmsListener("TRANSACTION.CREATED") → solo logging

service/
  AssetService          @PostConstruct siembra activos con precio 0 al arrancar
  TradingService        createOrder, getOrders, getPortfolio

controller/
  AssetController       GET /assets,    GET /assets/{id}       (sin JWT)
  OrderController       POST /orders,   GET /orders            (JWT)
  PortfolioController   GET /portfolio                         (JWT)
```

---

## Flujo POST /orders (compra/venta)

```
Frontend
  POST /orders
  Authorization: Bearer <token>
  Body: { asset:"bitcoin", tipo:"COMPRA", cantidad:0.01 }
         │
         ▼
API Gateway  ──  JwtAuthFilter
  inyecta X-User-Id en el header
         │
         ▼
OrderController.create(userId, OrderRequest)
         │
         ▼
TradingService.createOrder(userId, request)

  1. assetRepository.findById("bitcoin")
     → obtiene precioUnitario actual (guardado por PriceConsumer)
     → lanza error si precio = 0 (price-service aún no ha publicado)

  2. Si VENTA:
     portfolioRepository.findByUserIdAndAsset(userId, "bitcoin")
     → comprueba que cantidad en cartera >= cantidad solicitada
     → lanza error si insuficiente

  3. new OrderEntity()
     precioUnitario = asset.getPriceUsd()   ← precio bloqueado en el momento
     total          = cantidad * precioUnitario
     fecha          = LocalDateTime.now()
     orderRepository.save(order)

  4. actualizarPortfolio(userId, asset, cantidad, tipo)
     COMPRA → portfolio.cantidad += cantidad
     VENTA  → portfolio.cantidad -= cantidad
     (crea el registro si no existía)

  @Transactional garantiza que orden + portfolio se guardan juntos o ninguno
         │
         ▼
Frontend recibe: OrderResponse con id, total y precio en el momento de la compra
```

## Flujo GET /portfolio

```
GET /portfolio  +  X-User-Id (del gateway)
         │
         ▼
TradingService.getPortfolio(userId)
  portfolioRepository.findByUserId(userId)
  filtra cantidad > 0  (excluye activos vendidos totalmente)
  por cada entry:
    assetRepository.findById(asset) → precio actual
    new PortfolioResponse(entry, precioActual)
      valorTotal = cantidad * precioActual   ← valoración en tiempo real
         │
         ▼
Frontend recibe: [
  { asset:"bitcoin", cantidad:0.01, precioActual:65000, valorTotal:650.0 },
  ...
]
```

## Flujo IBM MQ — PriceConsumer

```
price-service publica en cola PRICE.UPDATED cada 30s:
  { asset:"bitcoin", priceUsd:65000.0, updatedAt:"..." }
         │
         ▼
PriceConsumer.onPriceUpdated(message)
  deserializa JSON
  assetRepository.findById(asset)  → busca o crea AssetEntity
  entity.setPriceUsd(priceUsd)
  entity.setUpdatedAt(now)
  assetRepository.save(entity)

Efecto: el precio usado en createOrder y getPortfolio es siempre el más reciente
        sin que trading-service llame directamente a price-service
```

## Reglas de negocio

| Regla | Descripción |
|---|---|
| Precio bloqueado | El `precioUnitario` de una orden es el precio en el instante de la compra, no cambia |
| Venta con saldo | No se puede vender más de lo que hay en portfolio → error 500 con mensaje claro |
| Precio cero | No se puede operar si el precio aún no llegó de price-service → error explícito |
| Portfolio neto | Solo se muestran activos con `cantidad > 0` en GET /portfolio |
| Atomicidad | `@Transactional` en `createOrder` garantiza consistencia orden ↔ portfolio |

## Tablas en BD

```sql
assets     (id VARCHAR PK, price_usd DOUBLE, updated_at TIMESTAMP)
orders     (id UUID PK, user_id, asset, tipo, cantidad, precio_unitario, total, fecha)
portfolio  (id UUID PK, user_id, asset, cantidad, UNIQUE(user_id, asset))
```
