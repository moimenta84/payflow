pero ves # PayFlow — Plan de Producto
**Fecha:** 2026-05-25  
**Producto:** Plataforma de finanzas personales + trading crypto  
**Tagline propuesto:** "Controla tu dinero. Opera con crypto."

---

## Diagnóstico técnico (base de hechos verificados)

| Problema | Evidencia | Impacto |
|---|---|---|
| Artemis cross-service roto | `PricePublisher` y `PriceConsumer` en JVMs separadas — `"PRICE.UPDATED"` nunca cruza | AssetEntity nunca se actualiza en trading-service |
| `TransactionConsumer` vacío | Solo hace `log`, sin persistencia — comentario "el balance vive en transaction-service" | La cola `TRANSACTION.CREATED` no aporta valor |
| Sin historial de precios | `AssetEntity` solo tiene `priceUsd` actual — sin tabla de snapshots | Imposible mostrar gráficas |
| Landing B2B vs producto B2C | Landing dice "API para equipos €49-€199/mes"; producto es app personal gratuita | Confusión de identidad grave |
| Solo 4 criptos | `app.assets=bitcoin,ethereum,solana,ripple` en ambos `application.properties` | Oferta muy limitada |
| Sin dashboard unificado | Home = transacciones; Crypto = trading — sin visión global | UX fragmentada |

---

## Fase 0 — APIs y patrones de referencia (ya verificados)

### Backend patterns verificados
```
CoinGeckoClient.fetchPrices(List<String> assets)
  → GET /simple/price?ids={ids}&vs_currencies=usd
  → retorna Map<String, Double>

AssetEntity: id(String), priceUsd(Double), updatedAt(LocalDateTime)
  → tabla "assets" en trading_db
  → PK = nombre del activo (e.g. "bitcoin")

PriceAlertEntity: id, userId, userEmail, asset, targetPrice, direction(ABOVE|BELOW), triggered, createdAt, triggeredAt
  → tabla "price_alerts" en price_db

TransactionEntity: id, userId, tipo(INGRESO|GASTO), categoria(enum 8 valores), descripcion, cantidad(Double), fecha(LocalDate)
  → tabla "transactions" en transactions_db

OrderEntity: id, userId, asset, tipo(COMPRA|VENTA), cantidad, precioUnitario, total, fecha(LocalDateTime)
  → tabla "orders" en trading_db
```

### Frontend patterns verificados
```
transactionsStore.js: listTransacciones(), addTransaccion(), updateTransaccion(), deleteTransaccion()
  → llaman a GET/POST/PUT/DELETE /transactions

api base: axios con interceptor JWT Bearer
Rutas: /, /login, /registro, /recuperar-password, /home, /crypto, /admin/*
```

### Anti-patterns a evitar
- NO usar `spring.artemis.mode=embedded` para comunicación cross-service (JVMs separadas)
- NO asumir que `PriceConsumer` actualiza `AssetEntity` (está roto)
- NO añadir `TransactionPublisher` si no hay consumidor real que lo use
- NO usar Chart.js directo en React — usar Recharts (mejor integración JSX)

---

## Fase 1 — Corrección arquitectura: comunicación entre servicios
**Objetivo:** Que `trading-service` tenga precios reales sin depender de Artemis cross-service.

### Qué cambiar en backend

**trading-service** — añadir `PriceScheduler.java`:
```java
// Nuevo archivo: backend/trading-service/src/main/java/com/payflow/trading/scheduler/PriceScheduler.java
@Component
@EnableScheduling
public class PriceScheduler {
    // WebClient o RestTemplate a http://price-service/prices (via Eureka lb://)
    // @Scheduled(fixedRate = 35000)  ← ligeramente más que price-service (35s vs 30s)
    // Para cada precio: assetRepository.save(new AssetEntity(asset, price, LocalDateTime.now()))
}
```

**trading-service** — eliminar o dejar vacío `PriceConsumer.java` (ya solo hacía log)

**trading-service/application.properties** — añadir:
```properties
# Ya no necesita Artemis para precios
spring.artemis.mode=embedded          # mantener si se usa para algo interno
spring.artemis.embedded.enabled=false # desactivar si no hay listeners activos
```

**Patrón a copiar:** `backend/price-service/src/main/java/com/payflow/price/service/PriceService.java` (ya usa `@Scheduled` + `CoinGeckoClient`)

### Verificación
- `GET /portfolio` devuelve precios > 0 para todos los activos
- `AssetEntity.updatedAt` se actualiza cada 35s
- `grep -r "JmsListener" backend/trading-service/` → 0 resultados (o inactivo)

---

## Fase 2 — Ampliar catálogo crypto: 4 → 15 activos
**Objetivo:** Más criptos disponibles para trading y alertas.

### Criptos a añadir (IDs exactos de CoinGecko `/simple/price?ids=...`)
```
Actuales: bitcoin, ethereum, solana, ripple
Añadir:   dogecoin, cardano, avalanche-2, chainlink, polkadot, litecoin, near, uniswap, matic-network, cosmos, algorand
```

### Cambios necesarios

**price-service/src/main/resources/application.properties:**
```properties
app.assets=bitcoin,ethereum,solana,ripple,dogecoin,cardano,avalanche-2,chainlink,polkadot,litecoin,near,uniswap,matic-network,cosmos,algorand
```

**trading-service/src/main/resources/application.properties:**
```properties
app.assets=bitcoin,ethereum,solana,ripple,dogecoin,cardano,avalanche-2,chainlink,polkadot,litecoin,near,uniswap,matic-network,cosmos,algorand
```

**Frontend — Crypto page:** el selector de activos debe leer `/assets` (ya es dinámico desde `AssetController`) — sin cambios si ya usa la API.

### Verificación
- `GET /prices` devuelve 15 activos
- `GET /assets` devuelve 15 activos
- CoinGecko admite hasta 250 IDs por llamada — sin problema de rate limit

---

## Fase 3 — Historial de precios en BD (prerequisito para gráficas)
**Objetivo:** Almacenar snapshots de precios para mostrar gráficas históricas.

### Nuevo en price-service

**Nueva entidad `PriceSnapshotEntity`:**
```java
// backend/price-service/src/main/java/com/payflow/price/entity/PriceSnapshotEntity.java
@Entity @Table(name="price_snapshots",
  indexes = @Index(columnList = "asset, recorded_at"))
// Campos:
//   id (Long, @GeneratedValue)
//   asset (String, NOT NULL)
//   priceUsd (Double, NOT NULL)
//   recordedAt (LocalDateTime, NOT NULL)
```

**Nuevo repositorio `PriceSnapshotRepository`:**
```java
List<PriceSnapshotEntity> findByAssetAndRecordedAtAfterOrderByRecordedAtAsc(
    String asset, LocalDateTime since);
```

**Modificar `PriceService.fetchAndPublish()`:** después de actualizar el cache, guardar snapshot:
```java
// snapshotRepository.save(new PriceSnapshotEntity(asset, price, LocalDateTime.now()))
// Borrar snapshots > 30 días (limpiar BD): @Scheduled con deleteByRecordedAtBefore(LocalDateTime.now().minusDays(30))
```

**Nuevo endpoint en `PriceController`:**
```java
// GET /prices/{asset}/history?period=24h|7d|30d
// Parámetro "period": 24h → últimas 24h, 7d → últimos 7 días, 30d → último mes
// Devuelve: List<PriceSnapshotResponse> [{asset, priceUsd, recordedAt}]
```

**Añadir ruta en api-gateway/application.yml:**
```yaml
- id: prices-history
  uri: lb://price-service
  predicates:
    - Path=/prices/*/history
```

### Verificación
- `GET /prices/bitcoin/history?period=24h` devuelve lista con ~2880 puntos (30s × 60min × 24h)
- Tabla `price_snapshots` crece en price_db

---

## Fase 4 — Dashboard unificado (Frontend)
**Objetivo:** Home page que muestre finanzas + crypto en una sola pantalla.

### Rediseño de `/home` (Home.jsx)

**Layout propuesto (tres secciones):**

```
┌─────────────────────────────────────────┐
│  Hola, Iker  [avatar]        [logout]  │
├─────────────┬───────────────────────────┤
│ Saldo fiat  │  Valor portfolio crypto   │
│  € 1,240    │       $ 3,820            │
├─────────────┴───────────────────────────┤
│  Patrimonio neto total: $ 5,060         │
├─────────────────────────────────────────┤
│  [Donut chart: % gastos vs ingresos]   │
│  Gastos: €420   Ingresos: €1,660       │
├─────────────────────────────────────────┤
│  Portfolio crypto (top 3 activos)       │
│  BTC 0.05  ETH 1.2  SOL 10             │
├─────────────────────────────────────────┤
│  Últimas 5 transacciones                │
│  [lista existente]                     │
└─────────────────────────────────────────┘
```

### Llamadas API necesarias
```javascript
// Ya existe:
GET /transactions/summary  → { totalIngresos, totalGastos, balance }
// Ya existe:
GET /portfolio             → [{ asset, cantidad, valorUsd }]
// Nuevo cálculo frontend:
patrimonioNeto = summary.balance + portfolio.reduce((s, p) => s + p.valorUsd, 0)
```

### Dependencias frontend
```bash
npm install recharts
# Recharts: LineChart, AreaChart, PieChart, ResponsiveContainer
```

### Componentes nuevos a crear
- `src/components/NetWorthCard.jsx` — saldo fiat + portfolio + total
- `src/components/PortfolioSummary.jsx` — top activos con valor actual
- `src/components/FinanceSummaryChart.jsx` — Recharts PieChart gastos vs ingresos

### Verificación
- `/home` carga en < 2s mostrando datos reales de ambas APIs
- El total neto se actualiza si cambia el precio de BTC

---

## Fase 5 — Gráficas históricas de precios (Frontend)
**Objetivo:** En la página Crypto, mostrar gráfica de precio del activo seleccionado.

### En página Crypto (`/crypto`)

**Nuevo componente `PriceChart.jsx`:**
```jsx
// GET /prices/{asset}/history?period={period}
// Usa Recharts AreaChart con gradiente
// Toggle 24h | 7d | 30d
// Eje X: hora/día  Eje Y: precio en USD
// Color verde si precio subió, rojo si bajó (comparar primer y último punto)
```

**Patrón a seguir:** Recharts AreaChart docs — https://recharts.org/en-US/api/AreaChart

**Datos del endpoint (ya diseñado en Fase 3):**
```javascript
// GET /prices/bitcoin/history?period=7d
// Response: [{ asset:"bitcoin", priceUsd: 65000, recordedAt:"2026-05-18T10:00:00" }, ...]
```

### Verificación
- Al seleccionar BTC se muestra gráfica con datos históricos reales
- El toggle 24h/7d/30d recarga el endpoint con distinto parámetro
- Sin errores de CORS (ruta ya en gateway)

---

## Fase 6 — Landing page coherente
**Objetivo:** Eliminar identidad B2B, contar la historia real del producto.

### Nueva estructura Landing.jsx

**Secciones:**
1. **Nav:** Logo PayFlow + links (Inicio, Cómo funciona, Registrarse)
2. **Hero:** "Tu dinero y tu crypto, en un solo lugar" + mockup del dashboard unificado + CTA "Empieza gratis"
3. **Features (3 cards):**
   - "Controla tus finanzas" — ingresos/gastos/categorías/PDF
   - "Opera con crypto" — BTC/ETH/SOL/+12 activos, precios en tiempo real
   - "Alertas inteligentes" — notificación cuando crypto alcanza tu precio objetivo
4. **Stats:** usuarios registrados (real del admin), transacciones procesadas, criptos disponibles (15)
5. **CTA final:** "Empieza gratis, sin tarjeta de crédito"
6. **Footer:** correcto — "Construido con Spring Boot, React y PostgreSQL" (sin RabbitMQ)

### Qué eliminar del Landing actual
- Planes de precios €49/€129/€199 (es app gratuita)
- "847 equipos activos" (falso social proof)
- "API v2.0 — ahora con multi-currency" (no es una API de pago)
- "Webhooks asíncronos con RabbitMQ" (no existe en el proyecto)
- "Intégralo en una tarde" (no es B2B)

### Verificación
- Ninguna mención a "API", "equipos", "webhooks", "RabbitMQ", "Stripe" en la nueva landing
- CTA lleva a `/registro`
- Footer correcto

---

## Fase 7 — Diseño responsive (Mobile-first)
**Objetivo:** Páginas principales funcionan en móvil (< 640px).

### Páginas a adaptar

**Landing.module.css:**
```css
@media (max-width: 640px) {
  .hero { flex-direction: column; }
  .heroR { display: none; }  /* ocultar mockup dashboard en móvil */
  .bento { grid-template-columns: 1fr; }
  .pGrid { grid-template-columns: 1fr; }
}
```

**Home.module.css:**
```css
@media (max-width: 640px) {
  .cuerpo { flex-direction: column; }
  .graficoContainer { width: 100%; }
  .saldoCard { font-size: clamp(1.5rem, 5vw, 2rem); }
}
```

**Navbar (si existe):**
- Añadir hamburger menu para móvil
- Usar `useState` para toggle del menú

### Verificación
- Chrome DevTools → iPhone 12 (390px) — sin scroll horizontal
- Formularios usables con teclado virtual

---

## Fase 8 — Despliegue con URL pública
**Objetivo:** App accesible en internet para la presentación del TFG.

### Estrategia recomendada

**Frontend → Vercel** (gratis, deploy en 2 min)
```bash
# Desde /frontend
npm run build
# Conectar repo GitHub a Vercel
# Variable de entorno: VITE_API_URL=https://payflow-gateway.railway.app
```

**Backend → Railway** (tier gratuito, $5 crédito/mes)
- 6 servicios Spring Boot + PostgreSQL como managed service
- Variables de entorno por servicio (DB_URL, JWT_SECRET, MAIL_USER, MAIL_PASS, EUREKA_URI)
- railway.json o Dockerfiles existentes

**Configuración de producción necesaria:**
```yaml
# api-gateway/application.yml — añadir origen Vercel en CORS:
allowedOrigins: "http://localhost:5173,https://payflow-tfg.vercel.app"
```

```properties
# Cada servicio — cambiar EUREKA_URI en Railway:
EUREKA_URI=http://discovery-service.railway.internal:8761/eureka
```

### Verificación
- URL pública accesible sin VPN
- Login funciona desde el móvil con la URL de producción
- Todos los microservicios registrados en Eureka de producción

---

## Orden de ejecución

| Fase | Tarea | Dificultad | Impacto en TFG |
|------|-------|-----------|----------------|
| 1 | Arreglar comunicación entre servicios | Media | **Crítico** — arquitectura funcional |
| 2 | 15 criptos | Baja | Alto — más catálogo |
| 3 | Historial de precios en BD | Media | Alto — prerequisito gráficas |
| 4 | Dashboard unificado | Media | **Crítico** — UX coherente |
| 5 | Gráficas históricas | Media | Alto — impacto visual |
| 6 | Landing coherente | Baja | **Crítico** — primera impresión |
| 7 | Responsive móvil | Baja-Media | Alto — demos en presentación |
| 8 | Despliegue | Media | Alto — URL pública |

**Tiempo estimado total:** 3-5 días de trabajo efectivo.

---

## Resumen del producto final

**PayFlow** es una app web para usuarios individuales que quieren:
1. Llevar un registro de sus ingresos y gastos con categorías e informes PDF
2. Comprar y vender criptomonedas viendo precios en tiempo real
3. Tener una visión unificada de su patrimonio (dinero fiat + crypto)
4. Configurar alertas de precio que les avisan por email

**Diferenciación:** La mayoría de apps de finanzas personales no tienen trading crypto integrado. La mayoría de apps de crypto no tienen gestor de gastos. PayFlow une los dos mundos.

**Stack:** Spring Boot 3 + Java 21 (microservicios) · React 19 + Recharts (frontend) · PostgreSQL · CoinGecko API · Spring Mail
