# PayFlow TFG — Implementation Plan

## Project Summary

PayFlow is a microservices cryptocurrency trading platform (TFG). Three backend services exist only as compiled JARs; three are completely missing; the frontend is absent. This plan reconstructs and completes all parts.

## Architecture

```
[Browser :5173]
     │
[API Gateway :8080]  ←── JWT filter, Admin filter, CORS
     ├── /auth/**       → auth-service       :8081  (PostgreSQL auth_db)
     ├── /prices/**     → price-service      :8084  (PostgreSQL price_db)
     ├── /alerts/**     → price-service      :8084
     ├── /orders/**     → trading-service    :8082  (PostgreSQL trading_db)
     ├── /portfolio/**  → trading-service    :8082
     ├── /assets/**     → trading-service    :8082
     ├── /transactions/ → transaction-service:8083  (PostgreSQL transaction_db)
     └── /admin/**      → auth-service       :8081

[Eureka :8761] ← all services register here
```

## Key Configuration (used throughout ALL phases)

- JWT secret: `payflow-super-secret-key-2024-tfg`
- JWT header injected by gateway: `X-User-Id`, `X-User-Role`
- DB user/pass: `postgres` / `payflow123`
- Spring Boot: `3.3.0`, Spring Cloud: `2023.0.1`, Java: `21`
- jjwt version: `0.12.5`
- Frontend CORS origin: `http://localhost:5173`
- CoinGecko base URL: `https://api.coingecko.com/api/v3`
- Price poll interval: `30000 ms`
- Tracked assets: `bitcoin,ethereum,solana,ripple`

---

## Phase 0 — Allowed APIs Reference

**Spring Boot 3.3 patterns used:**
- `@SpringBootApplication`, `@EnableEurekaServer`, `@EnableDiscoveryClient`
- `@RestController`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@DeleteMapping`
- `@Service`, `@Repository`, `@Entity`, `@Table`, `@Column`, `@Id`, `@GeneratedValue`
- `SecurityFilterChain` bean (not `WebSecurityConfigurerAdapter` — that's removed in Boot 3)
- `OncePerRequestFilter` for JWT filter
- `WebClient` (reactive HTTP client via `spring-boot-starter-webflux`)
- `@Scheduled(fixedRate = 30000)` for price scheduler
- `@EnableScheduling` on config class
- Spring Cloud Gateway routes defined in `application.yml`
- `JwtParser` from jjwt: `Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token)`
- `Jwts.builder()...signWith(key, SignatureAlgorithm.HS256).compact()` for token generation
- `@JmsListener` and `JmsTemplate` for ActiveMQ/Artemis messaging
- `spring.artemis.mode=embedded` for embedded broker

**Vue 3 + TypeScript patterns:**
- `createApp`, `defineComponent`, `ref`, `computed`, `onMounted`, `watch`
- Vue Router 4: `createRouter`, `createWebHistory`
- Pinia: `defineStore`, `storeToRefs`
- Axios: `axios.create({ baseURL })`, interceptors for JWT header

**Anti-patterns to AVOID:**
- Do NOT use `WebSecurityConfigurerAdapter` (removed in Spring Security 6)
- Do NOT use `HttpSecurity.antMatchers()` — use `requestMatchers()` instead
- Do NOT use `Jwts.parser()` (deprecated) — use `Jwts.parserBuilder()`
- Do NOT use Options API in Vue — use Composition API with `<script setup>`

---

## Phase 1 — Reconstruct: auth-service

**Goal:** Create full source code for `backend/auth-service/`.

**Directory structure to create:**
```
backend/auth-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/auth/
    │   ├── AuthApplication.java
    │   ├── config/
    │   │   ├── SecurityConfig.java
    │   │   └── GlobalExceptionHandler.java
    │   ├── controller/
    │   │   ├── AuthController.java
    │   │   └── AdminController.java
    │   ├── dto/
    │   │   ├── AuthResponse.java
    │   │   ├── LoginRequest.java
    │   │   ├── RegisterRequest.java
    │   │   ├── RolRequest.java
    │   │   └── UserResponse.java
    │   ├── entity/
    │   │   └── UserEntity.java  (with Rol enum: USER, ADMIN)
    │   ├── repository/
    │   │   └── UserRepository.java
    │   └── service/
    │       └── AuthService.java
    └── resources/
        └── application.properties
```

**pom.xml dependencies:** spring-boot-starter-web, spring-boot-starter-security, spring-boot-starter-data-jpa, spring-boot-starter-validation, spring-boot-starter-actuator, postgresql (runtime), spring-cloud-starter-netflix-eureka-client, jjwt-api/impl/jackson (0.12.5)

**application.properties:**
```properties
server.port=8081
spring.application.name=auth-service
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/auth_db}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:payflow123}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
eureka.client.service-url.defaultZone=${EUREKA_URI:http://localhost:8761/eureka}
app.jwt.secret=${JWT_SECRET:payflow-super-secret-key-2024-tfg}
app.jwt.expiration=86400000
management.endpoints.web.exposure.include=health
```

**Key implementation details:**

`UserEntity`:
- `@Entity @Table(name="users")`
- Fields: `id` (Long, auto), `username` (String, unique), `email` (String, unique), `password` (String, encoded), `rol` (enum Rol: USER/ADMIN)
- `implements UserDetails` — roles = `[ROLE_USER]` or `[ROLE_ADMIN]`

`AuthService`:
- Uses `PasswordEncoder` (BCrypt) to encode passwords
- `register()`: check username/email uniqueness, encode password, save, generate JWT
- `login()`: authenticate, generate JWT
- `generateToken(UserEntity)`: use jjwt, subject=username, claim "userId"=id, claim "role"=rol, sign with HS256

`AuthController` endpoints:
- `POST /auth/register` → `RegisterRequest(username, email, password)` → `AuthResponse(token, userId, username, rol)`
- `POST /auth/login` → `LoginRequest(username, password)` → `AuthResponse`
- `GET /auth/me` → reads `X-User-Id` header (injected by gateway) → returns `UserResponse`

`AdminController` endpoints:
- `GET /admin/users` → list all `UserResponse`
- `PATCH /admin/users/{id}/role` → `RolRequest(rol)` → update user role

`SecurityConfig`:
- Disable CSRF, stateless session
- Permit ALL for `/auth/login`, `/auth/register`
- All other requests require authentication
- `JwtAuthenticationFilter extends OncePerRequestFilter` reads `Authorization: Bearer <token>` or `X-User-Id` header

**Verification:** `mvn clean package -DskipTests` succeeds; JAR file created in target/.

---

## Phase 2 — Reconstruct: price-service

**Goal:** Create full source code for `backend/price-service/`.

**Directory structure:**
```
backend/price-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/price/
    │   ├── PriceApplication.java
    │   ├── client/
    │   │   └── CoinGeckoClient.java
    │   ├── config/
    │   │   ├── WebClientConfig.java
    │   │   └── GlobalExceptionHandler.java
    │   ├── controller/
    │   │   ├── PriceController.java
    │   │   └── AlertController.java
    │   ├── dto/
    │   │   ├── PriceResponse.java
    │   │   └── AlertRequest.java
    │   │   └── AlertResponse.java
    │   ├── entity/
    │   │   └── PriceAlertEntity.java  (Direction enum: UP, DOWN)
    │   ├── messaging/
    │   │   └── PricePublisher.java
    │   ├── repository/
    │   │   └── PriceAlertRepository.java
    │   ├── scheduler/
    │   │   └── PriceScheduler.java
    │   └── service/
    │       ├── PriceService.java
    │       └── AlertService.java
    └── resources/
        └── application.properties
```

**pom.xml dependencies:** spring-boot-starter-web, spring-boot-starter-webflux, spring-boot-starter-data-jpa, spring-boot-starter-actuator, spring-boot-starter-artemis, spring-boot-starter-mail, postgresql (runtime), spring-cloud-starter-netflix-eureka-client, artemis-jakarta-client (runtime)

**application.properties:** (already extracted — use exactly as in BOOT-INF/classes/application.properties)

**Key implementation details:**

`CoinGeckoClient`:
- Uses `WebClient` with base URL from `coingecko.base-url`
- `Map<String, Double> getPrices(List<String> ids)` — calls `/simple/price?ids={ids}&vs_currencies=usd`
- Returns map: `{ "bitcoin": 65000.0, "ethereum": 3200.0, ... }`

`PriceService`:
- In-memory cache: `Map<String, Double> latestPrices`
- `updatePrices()` called by scheduler, fetches from CoinGecko, updates cache
- Asset mapping: bitcoin→BTC, ethereum→ETH, solana→SOL, ripple→XRP

`PriceScheduler`:
- `@EnableScheduling` + `@Scheduled(fixedRate = 30000)`
- Calls `PriceService.updatePrices()`, then checks alerts, then publishes to JMS

`PricePublisher`:
- `JmsTemplate.convertAndSend("price-updates", priceMap)`

`PriceController` endpoints:
- `GET /prices/latest` → `Map<String, Double>` (all current prices)
- `GET /prices/{asset}` → `PriceResponse(asset, price, timestamp)`

`PriceAlertEntity`:
- `@Entity @Table(name="price_alerts")`
- Fields: id, userId (Long), asset (String), targetPrice (Double), direction (Direction: UP/DOWN), active (boolean), email (String)
- `Direction.UP` = alert fires when price goes ABOVE target
- `Direction.DOWN` = alert fires when price goes BELOW target

`AlertService`:
- `createAlert(userId, AlertRequest)` → saves entity
- `getUserAlerts(userId)` → list active alerts
- `deleteAlert(userId, alertId)` → soft delete (active=false)
- `checkAlerts(Map<String,Double> prices)` → for each active alert, check if triggered, send email via JavaMailSender, deactivate

`AlertController` endpoints:
- `GET /alerts` → `X-User-Id` header → list user's alerts
- `POST /alerts` → `AlertRequest(asset, targetPrice, direction, email)` → create alert
- `DELETE /alerts/{id}` → delete alert

**Verification:** `mvn clean package -DskipTests` succeeds.

---

## Phase 3 — Reconstruct: api-gateway

**Goal:** Create full source code for `backend/api-gateway/`.

**Directory structure:**
```
backend/api-gateway/
├── pom.xml
└── src/main/
    ├── java/com/payflow/gateway/
    │   ├── GatewayApplication.java
    │   └── filter/
    │       ├── JwtAuthFilter.java
    │       └── AdminRoleFilter.java
    └── resources/
        └── application.yml
```

**pom.xml dependencies:** spring-cloud-starter-gateway (NOT spring-boot-starter-web — they conflict), spring-cloud-starter-netflix-eureka-client, spring-boot-starter-actuator, jjwt-api/impl/jackson (0.12.5)

**application.yml:** (already extracted — use exactly from tmp-gw extraction)

**Key implementation details:**

`JwtAuthFilter extends AbstractGatewayFilterFactory<JwtAuthFilter.Config>`:
- Reads `Authorization` header, extracts Bearer token
- Validates JWT using same secret `payflow-super-secret-key-2024-tfg`
- Extracts `userId` and `role` claims from token
- Adds headers to downstream request: `X-User-Id`, `X-User-Role`
- Returns 401 if token missing or invalid

`AdminRoleFilter extends AbstractGatewayFilterFactory<AdminRoleFilter.Config>`:
- Reads `X-User-Role` header (already set by JwtAuthFilter if chained, or validates JWT again)
- Returns 403 if role is not ADMIN

Note: Gateway uses reactive (Netty) stack — filters must return `Mono<Void>`, use `ServerWebExchange`, not `HttpServletRequest`.

**Verification:** `mvn clean package -DskipTests` succeeds; JAR starts without errors.

---

## Phase 4 — Create: discovery-service

**Goal:** Create Eureka server at `backend/discovery-service/`.

**Directory structure:**
```
backend/discovery-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/discovery/
    │   └── DiscoveryApplication.java
    └── resources/
        └── application.properties
```

**pom.xml:** parent spring-boot 3.3.0, spring-cloud-dependencies 2023.0.1, dependency: `spring-cloud-starter-netflix-eureka-server`, `spring-boot-starter-actuator`

**application.properties:**
```properties
server.port=8761
spring.application.name=discovery-service
eureka.client.register-with-eureka=false
eureka.client.fetch-registry=false
eureka.server.wait-time-in-ms-when-sync-empty=0
management.endpoints.web.exposure.include=health
```

**DiscoveryApplication.java:**
```java
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryApplication.class, args);
    }
}
```

**Verification:** `mvn clean package -DskipTests`; starts on 8761; dashboard at `http://localhost:8761`.

---

## Phase 5 — Create: trading-service

**Goal:** Create full source at `backend/trading-service/`.

**Directory structure:**
```
backend/trading-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/trading/
    │   ├── TradingApplication.java
    │   ├── client/
    │   │   └── PriceClient.java      (WebClient to price-service via Eureka)
    │   │   └── TransactionClient.java (WebClient to transaction-service)
    │   ├── config/
    │   │   └── WebClientConfig.java
    │   │   └── GlobalExceptionHandler.java
    │   ├── controller/
    │   │   ├── AssetController.java
    │   │   ├── OrderController.java
    │   │   └── PortfolioController.java
    │   ├── dto/
    │   │   ├── AssetResponse.java
    │   │   ├── OrderRequest.java
    │   │   ├── OrderResponse.java
    │   │   └── PortfolioResponse.java
    │   ├── entity/
    │   │   ├── WalletEntry.java
    │   │   └── OrderEntity.java  (OrderType: BUY/SELL, OrderStatus: COMPLETED)
    │   ├── repository/
    │   │   ├── WalletRepository.java
    │   │   └── OrderRepository.java
    │   └── service/
    │       ├── TradingService.java
    │       └── PortfolioService.java
    └── resources/
        └── application.properties
```

**application.properties:**
```properties
server.port=8082
spring.application.name=trading-service
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/trading_db}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:payflow123}
spring.jpa.hibernate.ddl-auto=update
eureka.client.service-url.defaultZone=${EUREKA_URI:http://localhost:8761/eureka}
management.endpoints.web.exposure.include=health
price.service.url=${PRICE_SERVICE_URL:http://localhost:8084}
transaction.service.url=${TRANSACTION_SERVICE_URL:http://localhost:8083}
```

**DB Schema:**
```sql
-- WalletEntry: one row per (user_id, asset)
-- asset values: USDT, BTC, ETH, SOL, XRP
CREATE TABLE wallet_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  asset VARCHAR(10) NOT NULL,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0,
  UNIQUE(user_id, asset)
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(4) NOT NULL,   -- BUY or SELL
  asset VARCHAR(10) NOT NULL,
  amount DECIMAL(20,8) NOT NULL,
  price DECIMAL(20,2) NOT NULL,
  total DECIMAL(20,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMP NOT NULL
);
```

**Key implementation details:**

`WalletEntry @Entity`:
- Fields: id, userId (Long), asset (String), amount (BigDecimal)
- `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","asset"}))`

`WalletRepository`:
- `Optional<WalletEntry> findByUserIdAndAsset(Long userId, String asset)`
- `List<WalletEntry> findByUserId(Long userId)`

`PriceClient`:
- `WebClient` to `http://price-service` (via Eureka lb://) or fallback to direct URL
- `Double getPrice(String asset)` — GET /prices/{asset} → extracts price field
- Asset→CoinGecko symbol mapping: BTC→bitcoin, ETH→ethereum, SOL→solana, XRP→ripple

`TradingService.executeBuy(Long userId, OrderRequest req)`:
1. Get current price from PriceClient
2. Calculate total = amount * price
3. Ensure USDT wallet exists (create with 10000 if first-time user)
4. Check USDT balance >= total; throw if insufficient
5. Deduct USDT, add crypto to wallet (create entry if needed)
6. Create OrderEntity (BUY, COMPLETED, timestamp=now)
7. Call TransactionClient to record transaction
8. Return OrderResponse

`TradingService.executeSell(Long userId, OrderRequest req)`:
1. Get current price from PriceClient
2. Check crypto balance >= amount; throw if insufficient
3. Deduct crypto, add USDT to wallet
4. Create OrderEntity (SELL, COMPLETED)
5. Call TransactionClient
6. Return OrderResponse

`TransactionClient`:
- POST /transactions → body: `{userId, type, asset, amount, price, total, timestamp}`
- Fire-and-forget (non-blocking acceptable if transient failure ok for TFG)

`AssetController`:
- `GET /assets` → fetches prices for BTC/ETH/SOL/XRP from PriceClient, returns list of `AssetResponse(symbol, name, price, change24h)`
- Public endpoint (no auth needed — gateway passes through)

`OrderController`:
- `GET /orders` — reads `X-User-Id` header — returns user's orders (newest first)
- `POST /orders/buy` — reads `X-User-Id` — calls `TradingService.executeBuy()`
- `POST /orders/sell` — reads `X-User-Id` — calls `TradingService.executeSell()`

`PortfolioController`:
- `GET /portfolio` — reads `X-User-Id` — returns wallet balances + total value in USDT

**pom.xml dependencies:** spring-boot-starter-web, spring-boot-starter-webflux, spring-boot-starter-data-jpa, spring-boot-starter-actuator, postgresql (runtime), spring-cloud-starter-netflix-eureka-client, spring-cloud-starter-loadbalancer

**Verification:** `mvn clean package -DskipTests`; service registers in Eureka; buy/sell endpoints work.

---

## Phase 6 — Create: transaction-service

**Goal:** Create full source at `backend/transaction-service/`.

**Directory structure:**
```
backend/transaction-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/transaction/
    │   ├── TransactionApplication.java
    │   ├── config/
    │   │   └── GlobalExceptionHandler.java
    │   ├── controller/
    │   │   └── TransactionController.java
    │   ├── dto/
    │   │   ├── TransactionRequest.java
    │   │   └── TransactionResponse.java
    │   ├── entity/
    │   │   └── TransactionEntity.java
    │   ├── repository/
    │   │   └── TransactionRepository.java
    │   └── service/
    │       └── TransactionService.java
    └── resources/
        └── application.properties
```

**application.properties:**
```properties
server.port=8083
spring.application.name=transaction-service
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/transaction_db}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:payflow123}
spring.jpa.hibernate.ddl-auto=update
eureka.client.service-url.defaultZone=${EUREKA_URI:http://localhost:8761/eureka}
management.endpoints.web.exposure.include=health
```

**TransactionEntity:**
```java
@Entity @Table(name="transactions")
// Fields: id (Long), userId (Long), type (String: BUY/SELL), asset (String),
//         amount (BigDecimal), price (BigDecimal), total (BigDecimal), timestamp (LocalDateTime)
```

**TransactionController:**
- `GET /transactions` — reads `X-User-Id` header — returns user transactions, newest first
- `POST /transactions` — body: `TransactionRequest` — saves transaction (called by trading-service)

**pom.xml dependencies:** spring-boot-starter-web, spring-boot-starter-data-jpa, spring-boot-starter-actuator, postgresql (runtime), spring-cloud-starter-netflix-eureka-client

**Verification:** `mvn clean package -DskipTests`; service registers in Eureka.

---

## Phase 7 — Create: Frontend (Vue.js 3 + TypeScript)

**Goal:** Create a complete Vue.js 3 TypeScript frontend at `frontend/`.

**Setup command:**
```
cd C:\2_Daw\TFG\frontend
npm create vite@latest . -- --template vue-ts
npm install vue-router@4 pinia axios
```

**Directory structure:**
```
frontend/
├── package.json
├── vite.config.ts
├── index.html
├── public/
└── src/
    ├── main.ts
    ├── App.vue
    ├── router/
    │   └── index.ts
    ├── stores/
    │   ├── auth.ts
    │   └── prices.ts
    ├── services/
    │   └── api.ts          (axios instance with JWT interceptor)
    ├── types/
    │   └── index.ts        (TypeScript interfaces)
    ├── views/
    │   ├── LoginView.vue
    │   ├── RegisterView.vue
    │   ├── DashboardView.vue
    │   ├── TradingView.vue
    │   ├── TransactionsView.vue
    │   └── AlertsView.vue
    └── components/
        ├── AppHeader.vue
        ├── PriceCard.vue
        ├── OrderForm.vue
        ├── PortfolioTable.vue
        └── TransactionList.vue
```

**vite.config.ts** — proxy all `/api` to `http://localhost:8080` (removes /api prefix when forwarding):
```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

**Design (dark crypto theme):**
- Background: `#0a0e1a` (near-black navy)
- Card: `#111827` / `#1f2937`
- Primary accent: `#6366f1` (indigo)
- Green: `#10b981` (gains), Red: `#ef4444` (losses)
- Font: Inter or system sans-serif
- CSS custom properties, no external UI framework (keeps it lean)

**Page-by-page requirements:**

`LoginView.vue`:
- Form: username + password
- On submit: `POST /api/auth/login` → store token in Pinia + localStorage
- Redirect to `/dashboard` on success
- Link to `/register`

`RegisterView.vue`:
- Form: username + email + password
- On submit: `POST /api/auth/register` → auto-login and redirect

`DashboardView.vue`:
- Shows 4 `PriceCard` components (BTC, ETH, SOL, XRP)
- Polls `GET /api/prices/latest` every 10 seconds
- Each card shows: symbol, current price (USD), simple up/down indicator
- Portfolio summary widget (total value from `/api/portfolio`)

`TradingView.vue`:
- Left panel: Asset selector + OrderForm (buy/sell toggle, amount input, live price, total calculation)
- Right panel: PortfolioTable (current holdings)
- Below: order history list (from `GET /api/orders`)
- On submit: `POST /api/orders/buy` or `POST /api/orders/sell`
- Show success/error toast

`TransactionsView.vue`:
- Table of all transactions from `GET /api/transactions`
- Columns: Date, Type (BUY/SELL colored), Asset, Amount, Price, Total

`AlertsView.vue`:
- Form: asset dropdown, target price, direction (ABOVE/BELOW), email
- `POST /api/alerts`
- List existing alerts from `GET /api/alerts`
- Delete button per alert (`DELETE /api/alerts/{id}`)

`AppHeader.vue`:
- Logo "PayFlow" with gradient text
- Nav links: Dashboard, Trade, Transactions, Alerts
- Right side: USDT balance (from portfolio store) + username + logout button

**Auth store (Pinia):**
```ts
export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') ?? '')
  const userId = ref(localStorage.getItem('userId') ?? '')
  const username = ref(localStorage.getItem('username') ?? '')
  // login(), logout(), isAuthenticated computed
})
```

**api.ts (Axios instance):**
```ts
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

**Router navigation guards:** redirect to `/login` if not authenticated; redirect to `/dashboard` if already logged in and visiting `/login`.

**Verification:**
- `npm run dev` starts on port 5173
- Can register, login, view prices, execute trades, see transactions, manage alerts

---

## Phase 8 — Infrastructure: Docker Compose + README

**Goal:** Create `docker-compose.yml` and `README.md` in project root.

**docker-compose.yml structure:**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: payflow123
    volumes:
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  discovery-service:
    build: ./backend/discovery-service
    ports: ["8761:8761"]
    depends_on: [postgres]

  auth-service:
    build: ./backend/auth-service
    ports: ["8081:8081"]
    depends_on: [discovery-service, postgres]
    environment:
      EUREKA_URI: http://discovery-service:8761/eureka

  price-service:
    build: ./backend/price-service
    ports: ["8084:8084"]
    depends_on: [discovery-service, postgres]
    environment:
      EUREKA_URI: http://discovery-service:8761/eureka

  trading-service:
    build: ./backend/trading-service
    ports: ["8082:8082"]
    depends_on: [discovery-service, postgres]
    environment:
      EUREKA_URI: http://discovery-service:8761/eureka

  transaction-service:
    build: ./backend/transaction-service
    ports: ["8083:8083"]
    depends_on: [discovery-service, postgres]
    environment:
      EUREKA_URI: http://discovery-service:8761/eureka

  api-gateway:
    build: ./backend/api-gateway
    ports: ["8080:8080"]
    depends_on: [discovery-service, auth-service]
    environment:
      EUREKA_URI: http://discovery-service:8761/eureka

  frontend:
    build: ./frontend
    ports: ["5173:80"]
    depends_on: [api-gateway]
```

**docker/init.sql:** creates 4 databases (auth_db, price_db, trading_db, transaction_db)

**Each service needs a Dockerfile:**
```dockerfile
FROM eclipse-temurin:21-jre-alpine
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**frontend/Dockerfile:**
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**README.md sections:** project description, architecture diagram, prerequisites, quick start (Docker and manual), environment variables, API reference, screenshots placeholder.

---

## Phase 9 — Verification

**Goal:** Ensure everything builds and integrates correctly.

**Build checks:**
```bash
# Build all backend services
cd backend/discovery-service && mvn clean package -DskipTests
cd backend/auth-service && mvn clean package -DskipTests
cd backend/price-service && mvn clean package -DskipTests
cd backend/api-gateway && mvn clean package -DskipTests
cd backend/trading-service && mvn clean package -DskipTests
cd backend/transaction-service && mvn clean package -DskipTests

# Build frontend
cd frontend && npm run build
```

**Integration test sequence (manual, all services running):**
1. Register user → `POST /api/auth/register` → expect token
2. Login → `POST /api/auth/login` → expect token
3. Get prices → `GET /api/prices/latest` → expect BTC/ETH/SOL/XRP prices
4. Get assets → `GET /api/assets` → expect 4 assets with prices
5. Get portfolio → `GET /api/portfolio` (auth) → expect USDT wallet with 10000 (first time)
6. Buy BTC → `POST /api/orders/buy` `{asset:"BTC", amount:0.01}` → expect success
7. Get portfolio → expect USDT deducted, BTC added
8. Get transactions → `GET /api/transactions` → expect 1 record
9. Create alert → `POST /api/alerts` → expect saved
10. Get alerts → `GET /api/alerts` → expect list

**Anti-pattern grep checks:**
```bash
grep -r "WebSecurityConfigurerAdapter" backend/  # Should be 0 matches
grep -r "antMatchers" backend/                   # Should be 0 matches
grep -r "Jwts.parser()" backend/                 # Should be 0 matches (use parserBuilder)
```

---

## Execution Order

| Phase | Task | Estimated effort |
|-------|------|-----------------|
| 1 | Reconstruct auth-service | Medium |
| 2 | Reconstruct price-service | Medium |
| 3 | Reconstruct api-gateway | Small |
| 4 | Create discovery-service | Small |
| 5 | Create trading-service | Large |
| 6 | Create transaction-service | Small |
| 7 | Create frontend | Large |
| 8 | Docker Compose + README | Small |
| 9 | Verification | Medium |

**Start with Phase 4 (discovery-service) first** — it's the simplest and needed for all others to register. Then Phase 1 (auth-service) as the authentication foundation, then in order.

**Critical path:** discovery → auth → price → gateway → trading → transactions → frontend → infra
