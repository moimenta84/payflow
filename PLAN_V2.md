# PayFlow — Plan V2: Bank API + Módulo Autónomos + Fix USDT

**Fecha:** 2026-05-25  
**Fases:** 7 (ejecutables consecutivamente en contextos independientes)

---

## Phase 0 — Patrones de Referencia Verificados

### Patrón pom.xml (copiar de transaction-service)
- Parent: `spring-boot-starter-parent:3.3.0`
- `<java.version>21</java.version>`
- `<spring-cloud.version>2023.0.1</spring-cloud.version>`
- PDF: proyecto usa `itext7-core:8.0.4` (NO OpenPDF — ya está en transaction-service)
- Spring Cloud BOM en `<dependencyManagement>`
- Build plugin: `spring-boot-maven-plugin`

### Patrón application.properties (copiar de transaction-service)
```properties
server.port=XXXX
spring.application.name=XXXX
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/XXXX_db}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:payflow123}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
eureka.client.service-url.defaultZone=${EUREKA_URI:http://localhost:8761/eureka}
management.endpoints.web.exposure.include=health
```

### Patrón Entity (IDs como UUID String)
```java
@Id @GeneratedValue(strategy = GenerationType.UUID)
private String id;
```

### Patrón Gateway filter — el JwtAuthFilter del proyecto usa:
```java
Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload()
```
(ya actualizado a la API nueva — NO usar parserBuilder)

### Patrón GlobalExceptionHandler — copiar exactamente de transaction-service:
- `@RestControllerAdvice`
- `@ExceptionHandler(MethodArgumentNotValidException.class)` → 400
- `@ExceptionHandler(RuntimeException.class)` → 400

### Patrón frontend
- **Router**: en App.jsx, envolver con `<ProtectedRoute><Page /></ProtectedRoute>`
- **Navbar**: `<NavLink to="/ruta" className={({ isActive }) => isActive ? \`\${style.link} \${style.linkActivo}\` : style.link}>Label</NavLink>`
- **Colors**: `--color-primary-300: #0891b2` (cian), `--color-primary-400: #0e7490`
- **API client**: `import { api } from '../config/api'`

### Anti-patterns
- NO `@EnableJms` ni artemis en los nuevos servicios (no necesitan mensajería)
- NO `WebSecurityConfigurerAdapter` (removido en Spring Security 6)
- NO Spring Security interno en bank-service ni invoicing-service (el gateway ya filtra)
- NO OpenPDF — usar iText7 (que ya está en el proyecto)

---

## Phase 1 — Fix: Lógica USDT en TradingService

**Archivo a editar:** `backend/trading-service/src/main/java/com/payflow/trading/service/TradingService.java`

**Problema actual:** `createOrder()` no gestiona USDT. Un usuario puede comprar crypto sin balance.

**Cambios a realizar en `TradingService.java`:**

Reemplazar el método `createOrder()` y `actualizarPortfolio()` con esta lógica:

```java
private static final String USDT = "USDT";
private static final double USDT_INICIAL = 10_000.0;

@Transactional
public OrderResponse createOrder(String userId, OrderRequest request) {

    AssetEntity asset = assetRepository.findById(request.getAsset())
            .orElseThrow(() -> new RuntimeException("Asset no encontrado: " + request.getAsset()));

    if (asset.getPriceUsd() == 0.0) {
        throw new RuntimeException("Precio de " + request.getAsset() + " aún no disponible");
    }

    double precio = asset.getPriceUsd();
    double cantidad = request.getCantidad();
    double total = cantidad * precio;

    if (request.getTipo() == OrderEntity.Tipo.COMPRA) {
        // Inicializar USDT si es primera operación
        PortfolioEntry usdt = portfolioRepository
                .findByUserIdAndAsset(userId, USDT)
                .orElseGet(() -> crearEntrada(userId, USDT, USDT_INICIAL));

        if (usdt.getCantidad() < total) {
            throw new RuntimeException("Saldo USDT insuficiente. Tienes "
                    + String.format("%.2f", usdt.getCantidad()) + " USDT, necesitas "
                    + String.format("%.2f", total) + " USDT");
        }
        usdt.setCantidad(usdt.getCantidad() - total);
        portfolioRepository.save(usdt);

        PortfolioEntry crypto = portfolioRepository
                .findByUserIdAndAsset(userId, request.getAsset())
                .orElseGet(() -> crearEntrada(userId, request.getAsset(), 0.0));
        crypto.setCantidad(crypto.getCantidad() + cantidad);
        portfolioRepository.save(crypto);

    } else { // VENTA
        PortfolioEntry crypto = portfolioRepository
                .findByUserIdAndAsset(userId, request.getAsset())
                .orElseThrow(() -> new RuntimeException(
                        "No tienes " + request.getAsset() + " en tu portfolio"));

        if (crypto.getCantidad() < cantidad) {
            throw new RuntimeException("Cantidad insuficiente: tienes "
                    + crypto.getCantidad() + " " + request.getAsset());
        }
        crypto.setCantidad(crypto.getCantidad() - cantidad);
        portfolioRepository.save(crypto);

        PortfolioEntry usdt = portfolioRepository
                .findByUserIdAndAsset(userId, USDT)
                .orElseGet(() -> crearEntrada(userId, USDT, 0.0));
        usdt.setCantidad(usdt.getCantidad() + total);
        portfolioRepository.save(usdt);
    }

    OrderEntity order = new OrderEntity();
    order.setUserId(userId);
    order.setAsset(request.getAsset());
    order.setTipo(request.getTipo());
    order.setCantidad(cantidad);
    order.setPrecioUnitario(precio);
    order.setTotal(total);
    order.setFecha(LocalDateTime.now());
    orderRepository.save(order);

    return new OrderResponse(order);
}

private PortfolioEntry crearEntrada(String userId, String asset, double cantidad) {
    PortfolioEntry e = new PortfolioEntry();
    e.setUserId(userId);
    e.setAsset(asset);
    e.setCantidad(cantidad);
    return portfolioRepository.save(e);
}
```

**Cambio en `getPortfolio()`** — USDT siempre vale 1.0:
```java
public List<PortfolioResponse> getPortfolio(String userId) {
    return portfolioRepository.findByUserId(userId)
            .stream()
            .filter(e -> e.getCantidad() > 0)
            .map(e -> {
                Double precio = USDT.equals(e.getAsset())
                        ? 1.0
                        : assetRepository.findById(e.getAsset())
                                .map(AssetEntity::getPriceUsd)
                                .orElse(0.0);
                return new PortfolioResponse(e, precio);
            })
            .toList();
}
```

**Eliminar** el método `actualizarPortfolio()` privado (ya no se necesita).

**Verificación:**
- `grep -r "actualizarPortfolio" backend/trading-service/` → 0 resultados
- `mvn clean package -DskipTests` en trading-service → BUILD SUCCESS
- Primera compra → crea entrada USDT con 10000 - total

---

## Phase 2 — Nuevo Microservicio: bank-service (:8085)

**Directorio a crear:** `backend/bank-service/`

### 2.1 Estructura de directorios
```
backend/bank-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/bank/
    │   ├── BankApplication.java
    │   ├── client/
    │   │   └── NordigenClient.java
    │   ├── config/
    │   │   └── GlobalExceptionHandler.java
    │   ├── controller/
    │   │   └── BankController.java
    │   ├── dto/
    │   │   ├── BankConnectionResponse.java
    │   │   ├── BankTransactionResponse.java
    │   │   └── InstitutionResponse.java
    │   ├── entity/
    │   │   ├── BankConnection.java  (status enum: PENDING, LINKED, EXPIRED)
    │   │   └── BankTransaction.java
    │   ├── repository/
    │   │   ├── BankConnectionRepository.java
    │   │   └── BankTransactionRepository.java
    │   └── service/
    │       └── BankService.java
    └── resources/
        └── application.properties
```

### 2.2 pom.xml
Copiar de transaction-service y cambiar:
- `<artifactId>bank-service</artifactId>`
- Quitar: artemis, iText7, validation
- Añadir: `spring-boot-starter-webflux` (para WebClient → Nordigen API)
- Mantener: web, data-jpa, actuator, postgresql, eureka-client

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.0</version>
  </parent>
  <groupId>com.payflow</groupId>
  <artifactId>bank-service</artifactId>
  <version>1.0.0</version>
  <properties>
    <java.version>21</java.version>
    <spring-cloud.version>2023.0.1</spring-cloud.version>
  </properties>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webflux</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
    <dependency><groupId>org.springframework.cloud</groupId><artifactId>spring-cloud-starter-netflix-eureka-client</artifactId></dependency>
  </dependencies>
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-dependencies</artifactId>
        <version>${spring-cloud.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>
  <build>
    <plugins>
      <plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin>
    </plugins>
  </build>
</project>
```

### 2.3 application.properties
```properties
server.port=8085
spring.application.name=bank-service
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/bank_db}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:payflow123}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
eureka.client.service-url.defaultZone=${EUREKA_URI:http://localhost:8761/eureka}
management.endpoints.web.exposure.include=health
nordigen.base-url=https://bankaccountdata.gocardless.com/api/v2
nordigen.secret-id=${NORDIGEN_SECRET_ID:demo}
nordigen.secret-key=${NORDIGEN_SECRET_KEY:demo}
transaction.service.url=${TRANSACTION_SERVICE_URL:http://localhost:8082}
```

### 2.4 BankApplication.java
```java
package com.payflow.bank;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BankApplication {
    public static void main(String[] args) {
        SpringApplication.run(BankApplication.class, args);
    }
}
```

### 2.5 Entidades

**BankConnection.java:**
```java
@Entity @Table(name = "bank_connections")
public class BankConnection {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false) private String userId;
    private String requisitionId;
    private String institutionId;
    private String institutionName;
    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;
    private String link;  // URL de autorización Nordigen
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status { PENDING, LINKED, EXPIRED }
    // getters/setters completos
}
```

**BankTransaction.java:**
```java
@Entity @Table(name = "bank_transactions")
public class BankTransaction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false) private String userId;
    private String bankConnectionId;
    private String externalId;    // ID en Nordigen
    private Double amount;
    private String currency;
    private String description;
    private LocalDate bookingDate;
    private boolean importedToPayflow = false;
    // getters/setters completos
}
```

### 2.6 NordigenClient.java

**IMPORTANTE:** Nordigen tiene un sistema de tokens de corta duración.
El cliente debe:
1. Obtener un access token: `POST /token/new/` con `{secret_id, secret_key}`
2. Usar ese token en todas las llamadas siguientes como `Bearer`
3. Refrescarlo si expira

**Modo demo (cuando `nordigen.secret-id=demo`):** Devolver datos mock en lugar de llamar a la API real.

```java
@Component
public class NordigenClient {

    @Value("${nordigen.base-url}")
    private String baseUrl;
    @Value("${nordigen.secret-id}")
    private String secretId;
    @Value("${nordigen.secret-key}")
    private String secretKey;

    private final WebClient webClient;
    private String cachedToken;
    private LocalDateTime tokenExpiry;

    public NordigenClient(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    // Si secretId=="demo" → devolver datos mock
    public boolean isDemoMode() { return "demo".equals(secretId); }

    // POST /token/new/ → { access, access_expires, refresh, refresh_expires }
    public String getAccessToken() {
        if (isDemoMode()) return "demo-token";
        if (cachedToken != null && LocalDateTime.now().isBefore(tokenExpiry)) return cachedToken;
        
        Map<String, String> body = Map.of("secret_id", secretId, "secret_key", secretKey);
        Map response = webClient.post()
                .uri(baseUrl + "/token/new/")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
        cachedToken = (String) response.get("access");
        tokenExpiry = LocalDateTime.now().plusSeconds(((Number) response.get("access_expires")).longValue() - 60);
        return cachedToken;
    }

    // GET /institutions/?country=es → lista de bancos
    public List<Map<String, Object>> getInstitutions() {
        if (isDemoMode()) return List.of(
            Map.of("id","SANDBOX_FNTT","name","Santander (Demo)","logo","https://storage.googleapis.com/gc-prd-institution_icons-production/ES/PNG/santander.png"),
            Map.of("id","SANDBOX_BBVA","name","BBVA (Demo)","logo",""),
            Map.of("id","SANDBOX_CAIXA","name","CaixaBank (Demo)","logo","")
        );
        String token = getAccessToken();
        return webClient.get()
                .uri(baseUrl + "/institutions/?country=es")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList()
                .block();
    }

    // POST /requisitions/ → { id, link }
    public Map<String, Object> createRequisition(String institutionId, String redirectUrl) {
        if (isDemoMode()) return Map.of(
            "id", "demo-req-" + System.currentTimeMillis(),
            "link", "https://example.com/sandbox-consent"
        );
        String token = getAccessToken();
        Map<String, String> body = Map.of(
            "redirect", redirectUrl,
            "institution_id", institutionId,
            "reference", "payflow-" + System.currentTimeMillis()
        );
        return (Map<String, Object>) webClient.post()
                .uri(baseUrl + "/requisitions/")
                .header("Authorization", "Bearer " + token)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    // GET /requisitions/{id}/ → { id, status, accounts: [...] }
    public Map<String, Object> getRequisition(String requisitionId) {
        if (isDemoMode()) return Map.of(
            "id", requisitionId,
            "status", "LN",
            "accounts", List.of("demo-account-001")
        );
        String token = getAccessToken();
        return (Map<String, Object>) webClient.get()
                .uri(baseUrl + "/requisitions/" + requisitionId + "/")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    // GET /accounts/{id}/transactions/ → { transactions: { booked: [...] } }
    public List<Map<String, Object>> getAccountTransactions(String accountId) {
        if (isDemoMode()) return List.of(
            Map.of("transactionId","t001","transactionAmount",Map.of("amount","-45.50","currency","EUR"),"remittanceInformationUnstructured","Supermercado Mercadona","bookingDate","2026-05-24"),
            Map.of("transactionId","t002","transactionAmount",Map.of("amount","1200.00","currency","EUR"),"remittanceInformationUnstructured","Nómina Empresa","bookingDate","2026-05-20"),
            Map.of("transactionId","t003","transactionAmount",Map.of("amount","-89.99","currency","EUR"),"remittanceInformationUnstructured","Spotify / Netflix","bookingDate","2026-05-18")
        );
        String token = getAccessToken();
        Map response = webClient.get()
                .uri(baseUrl + "/accounts/" + accountId + "/transactions/")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
        Map transactions = (Map) response.get("transactions");
        return (List<Map<String, Object>>) transactions.get("booked");
    }
}
```

### 2.7 BankService.java

```java
@Service
public class BankService {

    private final BankConnectionRepository connectionRepo;
    private final BankTransactionRepository transactionRepo;
    private final NordigenClient nordigenClient;
    private final RestTemplate restTemplate;

    @Value("${transaction.service.url}")
    private String transactionServiceUrl;

    public BankService(BankConnectionRepository connectionRepo,
                       BankTransactionRepository transactionRepo,
                       NordigenClient nordigenClient) {
        this.connectionRepo = connectionRepo;
        this.transactionRepo = transactionRepo;
        this.nordigenClient = nordigenClient;
        this.restTemplate = new RestTemplate();
    }

    // Paso 1: Crear requisition y devolver link de autorización
    public BankConnectionResponse iniciarConexion(String userId, String institutionId, String redirectUrl) {
        Map<String, Object> req = nordigenClient.createRequisition(institutionId, redirectUrl);

        BankConnection conn = new BankConnection();
        conn.setUserId(userId);
        conn.setRequisitionId((String) req.get("id"));
        conn.setInstitutionId(institutionId);
        conn.setInstitutionName(institutionId); // se actualiza en callback
        conn.setStatus(BankConnection.Status.PENDING);
        conn.setLink((String) req.get("link"));
        connectionRepo.save(conn);

        return new BankConnectionResponse(conn);
    }

    // Paso 2: Callback — verificar estado de la requisition
    @Transactional
    public void procesarCallback(String userId, String requisitionId) {
        BankConnection conn = connectionRepo.findByUserIdAndRequisitionId(userId, requisitionId)
                .orElseThrow(() -> new RuntimeException("Conexión no encontrada"));

        Map<String, Object> req = nordigenClient.getRequisition(requisitionId);
        String status = (String) req.get("status");

        if ("LN".equals(status)) { // LN = Linked
            conn.setStatus(BankConnection.Status.LINKED);
            connectionRepo.save(conn);
        }
    }

    // Obtener estado de conexión del usuario
    public Optional<BankConnectionResponse> getConexion(String userId) {
        return connectionRepo.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .map(BankConnectionResponse::new);
    }

    // Obtener y guardar transacciones bancarias
    @Transactional
    public List<BankTransactionResponse> sincronizarTransacciones(String userId) {
        BankConnection conn = connectionRepo
                .findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, BankConnection.Status.LINKED)
                .orElseThrow(() -> new RuntimeException("No tienes una cuenta bancaria vinculada"));

        Map<String, Object> req = nordigenClient.getRequisition(conn.getRequisitionId());
        List<String> accounts = (List<String>) req.get("accounts");

        List<BankTransactionResponse> resultado = new ArrayList<>();

        for (String accountId : accounts) {
            List<Map<String, Object>> rawTxs = nordigenClient.getAccountTransactions(accountId);
            for (Map<String, Object> raw : rawTxs) {
                String externalId = (String) raw.get("transactionId");

                // No duplicar si ya existe
                if (transactionRepo.existsByExternalId(externalId)) {
                    transactionRepo.findByExternalId(externalId)
                            .map(BankTransactionResponse::new)
                            .ifPresent(resultado::add);
                    continue;
                }

                Map<String, Object> amount = (Map<String, Object>) raw.get("transactionAmount");
                double amountVal = Double.parseDouble((String) amount.get("amount"));
                String currency = (String) amount.get("currency");
                String desc = (String) raw.getOrDefault("remittanceInformationUnstructured", "Transacción bancaria");
                LocalDate date = LocalDate.parse((String) raw.get("bookingDate"));

                BankTransaction tx = new BankTransaction();
                tx.setUserId(userId);
                tx.setBankConnectionId(conn.getId());
                tx.setExternalId(externalId);
                tx.setAmount(amountVal);
                tx.setCurrency(currency);
                tx.setDescription(desc);
                tx.setBookingDate(date);
                resultado.add(new BankTransactionResponse(transactionRepo.save(tx)));
            }
        }
        return resultado;
    }

    // Importar una transacción bancaria a PayFlow transaction-service
    public void importarTransaccion(String userId, String bankTransactionId) {
        BankTransaction tx = transactionRepo.findByIdAndUserId(bankTransactionId, userId)
                .orElseThrow(() -> new RuntimeException("Transacción no encontrada"));

        if (tx.isImportedToPayflow()) throw new RuntimeException("Ya importada");

        // Determinar tipo (positivo=INGRESO, negativo=GASTO)
        String tipo = tx.getAmount() >= 0 ? "INGRESO" : "GASTO";

        // Llamar a transaction-service via HTTP
        Map<String, Object> body = Map.of(
            "tipo", tipo,
            "categoria", "OTROS",
            "descripcion", tx.getDescription(),
            "cantidad", Math.abs(tx.getAmount()),
            "fecha", tx.getBookingDate().toString()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-Id", userId);  // header que espera transaction-service

        try {
            restTemplate.postForObject(
                transactionServiceUrl + "/transactions",
                new HttpEntity<>(body, headers),
                Object.class
            );
            tx.setImportedToPayflow(true);
            transactionRepo.save(tx);
        } catch (Exception e) {
            throw new RuntimeException("Error al importar: " + e.getMessage());
        }
    }

    // Desconectar banco
    @Transactional
    public void desconectar(String userId) {
        connectionRepo.findFirstByUserIdOrderByCreatedAtDesc(userId).ifPresent(conn -> {
            conn.setStatus(BankConnection.Status.EXPIRED);
            connectionRepo.save(conn);
        });
    }

    // Lista de bancos disponibles
    public List<Map<String, Object>> getInstituciones() {
        return nordigenClient.getInstitutions();
    }
}
```

### 2.8 BankController.java

```java
@RestController
@RequestMapping("/bank")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    // GET /bank/institutions — lista bancos (público, sin JWT — para el selector del frontend)
    @GetMapping("/institutions")
    public ResponseEntity<List<Map<String, Object>>> getInstitutions() {
        return ResponseEntity.ok(bankService.getInstituciones());
    }

    // POST /bank/connect — iniciar conexión
    // Body: { institutionId, redirectUrl }
    @PostMapping("/connect")
    public ResponseEntity<BankConnectionResponse> connect(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, String> body) {
        String redirectUrl = body.getOrDefault("redirectUrl", "http://localhost:5173/banco?connected=true");
        return ResponseEntity.ok(bankService.iniciarConexion(userId, body.get("institutionId"), redirectUrl));
    }

    // GET /bank/status — estado de la conexión del usuario
    @GetMapping("/status")
    public ResponseEntity<?> status(@RequestHeader("X-User-Id") String userId) {
        return bankService.getConexion(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // GET /bank/callback?ref={requisitionId} — Nordigen redirige aquí tras autorización
    // Esta ruta es PÚBLICA (sin JwtAuthFilter) — recibe userId como query param
    @GetMapping("/callback")
    public ResponseEntity<String> callback(
            @RequestParam String ref,
            @RequestParam String userId) {
        bankService.procesarCallback(userId, ref);
        return ResponseEntity.ok("Banco vinculado correctamente. Puedes cerrar esta ventana.");
    }

    // GET /bank/transactions — obtener (y sincronizar) transacciones del banco
    @GetMapping("/transactions")
    public ResponseEntity<List<BankTransactionResponse>> getTransactions(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(bankService.sincronizarTransacciones(userId));
    }

    // POST /bank/transactions/{id}/import — importar una transacción a PayFlow
    @PostMapping("/transactions/{id}/import")
    public ResponseEntity<Void> importTransaction(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        bankService.importarTransaccion(userId, id);
        return ResponseEntity.ok().build();
    }

    // DELETE /bank/disconnect — desconectar banco
    @DeleteMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@RequestHeader("X-User-Id") String userId) {
        bankService.desconectar(userId);
        return ResponseEntity.noContent().build();
    }
}
```

### 2.9 DTOs

**BankConnectionResponse:** `{ id, userId, institutionName, status, link, createdAt }`  
**BankTransactionResponse:** `{ id, amount, currency, description, bookingDate, importedToPayflow }`  
**InstitutionResponse:** `{ id, name, logo }`

### 2.10 Repositories

```java
// BankConnectionRepository
Optional<BankConnection> findByUserIdAndRequisitionId(String userId, String requisitionId);
Optional<BankConnection> findFirstByUserIdOrderByCreatedAtDesc(String userId);
Optional<BankConnection> findFirstByUserIdAndStatusOrderByCreatedAtDesc(String userId, BankConnection.Status status);

// BankTransactionRepository
boolean existsByExternalId(String externalId);
Optional<BankTransaction> findByExternalId(String externalId);
Optional<BankTransaction> findByIdAndUserId(String id, String userId);
List<BankTransaction> findByUserIdOrderByBookingDateDesc(String userId);
```

**Verificación Phase 2:**
- `mvn clean package -DskipTests` en `backend/bank-service/` → BUILD SUCCESS
- JAR creado en `target/bank-service-1.0.0.jar`

---

## Phase 3 — Nuevo Microservicio: invoicing-service (:8086)

**Directorio a crear:** `backend/invoicing-service/`

### 3.1 Estructura
```
backend/invoicing-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/invoicing/
    │   ├── InvoicingApplication.java
    │   ├── config/
    │   │   └── GlobalExceptionHandler.java
    │   ├── controller/
    │   │   ├── InvoiceController.java
    │   │   └── ExpenseController.java
    │   ├── dto/
    │   │   ├── InvoiceRequest.java
    │   │   ├── InvoiceResponse.java
    │   │   ├── ExpenseRequest.java
    │   │   ├── ExpenseResponse.java
    │   │   └── QuarterlySummaryResponse.java
    │   ├── entity/
    │   │   ├── InvoiceEntity.java
    │   │   └── ExpenseEntity.java
    │   ├── repository/
    │   │   ├── InvoiceRepository.java
    │   │   └── ExpenseRepository.java
    │   └── service/
    │       ├── InvoiceService.java
    │       └── InvoicePdfService.java
    └── resources/
        └── application.properties
```

### 3.2 pom.xml
Igual que bank-service pero:
- `<artifactId>invoicing-service</artifactId>`
- Sin webflux
- Añadir iText7 (copiar de transaction-service):
```xml
<dependency>
  <groupId>com.itextpdf</groupId>
  <artifactId>itext7-core</artifactId>
  <version>8.0.4</version>
  <type>pom</type>
</dependency>
```

### 3.3 application.properties
```properties
server.port=8086
spring.application.name=invoicing-service
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/invoicing_db}
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:payflow123}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
eureka.client.service-url.defaultZone=${EUREKA_URI:http://localhost:8761/eureka}
management.endpoints.web.exposure.include=health
```

### 3.4 InvoiceEntity.java
```java
@Entity @Table(name = "invoices")
public class InvoiceEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false) private String userId;
    private String numeroFactura;      // Auto-generado: F-2026-001, F-2026-002...
    private String clienteNombre;
    private String clienteNif;
    private String concepto;
    @Column(nullable = false) private Double baseImponible;
    private Double tipoIva    = 21.0;  // porcentaje
    private Double cuotaIva;           // calculado: base * tipoIva/100
    private Double tipoIrpf   = 15.0;  // porcentaje
    private Double cuotaIrpf;          // calculado: base * tipoIrpf/100
    private Double total;              // base + cuotaIva - cuotaIrpf
    private LocalDate fecha;
    @Enumerated(EnumType.STRING)
    private Estado estado = Estado.PENDIENTE;

    public enum Estado { PENDIENTE, COBRADA, CANCELADA }
    // getters/setters completos
}
```

### 3.5 ExpenseEntity.java
```java
@Entity @Table(name = "expenses")
public class ExpenseEntity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(nullable = false) private String userId;
    private String descripcion;
    private String proveedor;
    @Column(nullable = false) private Double baseImponible;
    private Double cuotaIva;    // IVA soportado (deducible)
    private Double total;
    private LocalDate fecha;
    @Enumerated(EnumType.STRING)
    private Categoria categoria = Categoria.OTROS;
    private boolean deducible = true;

    public enum Categoria { MATERIAL, SERVICIOS, SUMINISTROS, OTROS }
    // getters/setters completos
}
```

### 3.6 InvoiceService.java

```java
@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepo;
    private final ExpenseRepository expenseRepo;

    public InvoiceService(InvoiceRepository invoiceRepo, ExpenseRepository expenseRepo) {
        this.invoiceRepo = invoiceRepo;
        this.expenseRepo = expenseRepo;
    }

    public InvoiceResponse create(String userId, InvoiceRequest req) {
        InvoiceEntity inv = new InvoiceEntity();
        inv.setUserId(userId);
        inv.setClienteNombre(req.getClienteNombre());
        inv.setClienteNif(req.getClienteNif());
        inv.setConcepto(req.getConcepto());
        inv.setBaseImponible(req.getBaseImponible());

        double tipoIva   = req.getTipoIva()   != null ? req.getTipoIva()   : 21.0;
        double tipoIrpf  = req.getTipoIrpf()  != null ? req.getTipoIrpf()  : 15.0;
        double cuotaIva  = req.getBaseImponible() * tipoIva  / 100;
        double cuotaIrpf = req.getBaseImponible() * tipoIrpf / 100;

        inv.setTipoIva(tipoIva);
        inv.setCuotaIva(cuotaIva);
        inv.setTipoIrpf(tipoIrpf);
        inv.setCuotaIrpf(cuotaIrpf);
        inv.setTotal(req.getBaseImponible() + cuotaIva - cuotaIrpf);
        inv.setFecha(req.getFecha() != null ? req.getFecha() : LocalDate.now());
        inv.setNumeroFactura(generarNumero(userId));

        return new InvoiceResponse(invoiceRepo.save(inv));
    }

    private String generarNumero(String userId) {
        int year = LocalDate.now().getYear();
        long count = invoiceRepo.countByUserIdAndFechaYear(userId, year);
        return String.format("F-%d-%03d", year, count + 1);
    }

    public List<InvoiceResponse> getAll(String userId) {
        return invoiceRepo.findByUserIdOrderByFechaDesc(userId)
                .stream().map(InvoiceResponse::new).toList();
    }

    public InvoiceResponse getOne(String userId, String id) {
        return invoiceRepo.findByIdAndUserId(id, userId)
                .map(InvoiceResponse::new)
                .orElseThrow(() -> new RuntimeException("Factura no encontrada"));
    }

    public void cancel(String userId, String id) {
        InvoiceEntity inv = invoiceRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Factura no encontrada"));
        inv.setEstado(InvoiceEntity.Estado.CANCELADA);
        invoiceRepo.save(inv);
    }

    // Resumen trimestral — modelo 303 (IVA) y 130 (IRPF)
    public QuarterlySummaryResponse getQuarterlySummary(String userId, int year, int quarter) {
        LocalDate from = LocalDate.of(year, (quarter - 1) * 3 + 1, 1);
        LocalDate to   = from.plusMonths(3).minusDays(1);

        List<InvoiceEntity> facturas = invoiceRepo
                .findByUserIdAndFechaBetweenAndEstadoNot(userId, from, to, InvoiceEntity.Estado.CANCELADA);
        List<ExpenseEntity> gastos = expenseRepo
                .findByUserIdAndFechaBetweenAndDeducibleTrue(userId, from, to);

        double totalIngresos   = facturas.stream().mapToDouble(InvoiceEntity::getBaseImponible).sum();
        double ivaRepercutido  = facturas.stream().mapToDouble(InvoiceEntity::getCuotaIva).sum();
        double retencionesIRPF = facturas.stream().mapToDouble(InvoiceEntity::getCuotaIrpf).sum();
        double totalGastos     = gastos.stream().mapToDouble(ExpenseEntity::getBaseImponible).sum();
        double ivaSoportado    = gastos.stream().mapToDouble(e -> e.getCuotaIva() != null ? e.getCuotaIva() : 0).sum();

        double resultado303    = ivaRepercutido - ivaSoportado;
        double beneficioNeto   = totalIngresos - totalGastos;
        // Modelo 130: 20% del beneficio neto si es positivo, menos retenciones ya practicadas
        double pago130         = Math.max(0, beneficioNeto * 0.20 - retencionesIRPF);

        return new QuarterlySummaryResponse(
            year, quarter,
            totalIngresos, totalIngresos,
            ivaRepercutido, ivaSoportado, resultado303,
            totalIngresos, retencionesIRPF, pago130
        );
    }

    // Expenses CRUD
    public ExpenseResponse createExpense(String userId, ExpenseRequest req) {
        ExpenseEntity exp = new ExpenseEntity();
        exp.setUserId(userId);
        exp.setDescripcion(req.getDescripcion());
        exp.setProveedor(req.getProveedor());
        exp.setBaseImponible(req.getBaseImponible());
        exp.setCuotaIva(req.getBaseImponible() * 0.21);
        exp.setTotal(req.getBaseImponible() * 1.21);
        exp.setFecha(req.getFecha() != null ? req.getFecha() : LocalDate.now());
        exp.setCategoria(req.getCategoria() != null ? req.getCategoria() : ExpenseEntity.Categoria.OTROS);
        return new ExpenseResponse(expenseRepo.save(exp));
    }

    public List<ExpenseResponse> getExpenses(String userId) {
        return expenseRepo.findByUserIdOrderByFechaDesc(userId)
                .stream().map(ExpenseResponse::new).toList();
    }

    public void deleteExpense(String userId, String id) {
        ExpenseEntity exp = expenseRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Gasto no encontrado"));
        expenseRepo.delete(exp);
    }
}
```

### 3.7 InvoicePdfService.java

Usar iText7 (misma versión que transaction-service: 8.0.4).

```java
@Service
public class InvoicePdfService {

    private final InvoiceRepository invoiceRepo;

    public InvoicePdfService(InvoiceRepository invoiceRepo) {
        this.invoiceRepo = invoiceRepo;
    }

    public byte[] generateInvoicePdf(String userId, String invoiceId) {
        InvoiceEntity inv = invoiceRepo.findByIdAndUserId(invoiceId, userId)
                .orElseThrow(() -> new RuntimeException("Factura no encontrada"));

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf);

            // Colores del tema PayFlow
            DeviceRgb cian    = new DeviceRgb(8, 145, 178);
            DeviceRgb gris    = new DeviceRgb(107, 114, 128);

            // Título
            doc.add(new Paragraph("FACTURA")
                    .setFontSize(28).setBold().setFontColor(cian));
            doc.add(new Paragraph(inv.getNumeroFactura())
                    .setFontSize(14).setFontColor(gris));
            doc.add(new Paragraph("\n"));

            // Datos del cliente
            doc.add(new Paragraph("DATOS DEL CLIENTE").setBold().setFontColor(cian));
            doc.add(new Paragraph("Nombre: " + inv.getClienteNombre()));
            doc.add(new Paragraph("NIF: " + inv.getClienteNif()));
            doc.add(new Paragraph("Fecha: " + inv.getFecha().toString()));
            doc.add(new Paragraph("\n"));

            // Concepto
            doc.add(new Paragraph("CONCEPTO").setBold().setFontColor(cian));
            doc.add(new Paragraph(inv.getConcepto()));
            doc.add(new Paragraph("\n"));

            // Tabla de importes
            Table tabla = new Table(new float[]{4, 2});
            tabla.setWidth(UnitValue.createPercentValue(100));
            tabla.addCell(new Cell().add(new Paragraph("Base imponible")));
            tabla.addCell(new Cell().add(new Paragraph(String.format("%.2f €", inv.getBaseImponible()))));
            tabla.addCell(new Cell().add(new Paragraph(String.format("IVA (%s%%)", inv.getTipoIva().intValue()))));
            tabla.addCell(new Cell().add(new Paragraph(String.format("%.2f €", inv.getCuotaIva()))));
            tabla.addCell(new Cell().add(new Paragraph(String.format("IRPF (-%s%%)", inv.getTipoIrpf().intValue()))));
            tabla.addCell(new Cell().add(new Paragraph(String.format("-%.2f €", inv.getCuotaIrpf()))));
            tabla.addCell(new Cell().add(new Paragraph("TOTAL").setBold()));
            tabla.addCell(new Cell().add(new Paragraph(String.format("%.2f €", inv.getTotal())).setBold()));
            doc.add(tabla);

            doc.add(new Paragraph("\n"));
            doc.add(new Paragraph("Generado por PayFlow — Sistema de facturación para autónomos")
                    .setFontSize(9).setFontColor(gris).setItalic());

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF: " + e.getMessage());
        }
    }
}
```

### 3.8 Controllers

**InvoiceController.java:**
```java
@RestController @RequestMapping("/invoices")
public class InvoiceController {
    // POST /invoices → crear factura
    // GET /invoices → listar facturas del usuario
    // GET /invoices/{id} → detalle
    // DELETE /invoices/{id} → cancelar
    // GET /invoices/{id}/pdf → descargar PDF
    // GET /invoices/summary/quarterly?year=2026&quarter=1 → resumen fiscal
    // Todos usan @RequestHeader("X-User-Id") String userId
    // PDF devuelve ResponseEntity<byte[]> con MediaType.APPLICATION_PDF
}
```

**ExpenseController.java:**
```java
@RestController @RequestMapping("/expenses")
// POST /expenses, GET /expenses, DELETE /expenses/{id}
// Todos usan @RequestHeader("X-User-Id") String userId
```

### 3.9 Repositories

```java
// InvoiceRepository
List<InvoiceEntity> findByUserIdOrderByFechaDesc(String userId);
Optional<InvoiceEntity> findByIdAndUserId(String id, String userId);
List<InvoiceEntity> findByUserIdAndFechaBetweenAndEstadoNot(String userId, LocalDate from, LocalDate to, InvoiceEntity.Estado estado);
@Query("SELECT COUNT(i) FROM InvoiceEntity i WHERE i.userId = :userId AND YEAR(i.fecha) = :year")
long countByUserIdAndFechaYear(String userId, int year);

// ExpenseRepository
List<ExpenseEntity> findByUserIdOrderByFechaDesc(String userId);
Optional<ExpenseEntity> findByIdAndUserId(String id, String userId);
List<ExpenseEntity> findByUserIdAndFechaBetweenAndDeducibleTrue(String userId, LocalDate from, LocalDate to);
```

### 3.10 DTOs

**InvoiceRequest:** `{ clienteNombre, clienteNif, concepto, baseImponible, tipoIva?, tipoIrpf?, fecha? }`  
**InvoiceResponse:** todos los campos de InvoiceEntity  
**ExpenseRequest:** `{ descripcion, proveedor, baseImponible, fecha?, categoria? }`  
**ExpenseResponse:** todos los campos de ExpenseEntity  
**QuarterlySummaryResponse:** `{ year, quarter, totalIngresos, totalBaseImponible, ivaRepercutido, ivaSoportado, resultado303, baseIRPF, retencionesIRPF, pagoFraccionado130 }`

**Verificación Phase 3:**
- `mvn clean package -DskipTests` en `backend/invoicing-service/` → BUILD SUCCESS

---

## Phase 4 — Infraestructura: Gateway + init.sql

### 4.1 Editar `backend/init.sql`
Añadir al final del archivo:
```sql
CREATE DATABASE bank_db;
CREATE DATABASE invoicing_db;
```

### 4.2 Editar `backend/api-gateway/src/main/resources/application.yml`
Añadir ANTES de la sección `eureka:` las nuevas rutas:

```yaml
        - id: bank-callback
          uri: lb://bank-service
          predicates:
            - Path=/bank/callback, /bank/institutions
          # Sin JwtAuthFilter — callback es público

        - id: bank
          uri: lb://bank-service
          predicates:
            - Path=/bank/**
          filters:
            - name: JwtAuthFilter

        - id: invoices
          uri: lb://invoicing-service
          predicates:
            - Path=/invoices/**
          filters:
            - name: JwtAuthFilter

        - id: expenses
          uri: lb://invoicing-service
          predicates:
            - Path=/expenses/**
          filters:
            - name: JwtAuthFilter
```

**CRÍTICO:** `bank-callback` debe estar ANTES de `bank` en el YAML. Spring Cloud Gateway evalúa rutas en orden y la primera que coincide gana. `/bank/callback` debe matchear primero para no pasar por JwtAuthFilter.

**Verificación Phase 4:**
- `mvn clean package -DskipTests` en `backend/api-gateway/` → BUILD SUCCESS
- Revisar orden de rutas con `grep -n "id: bank" backend/api-gateway/src/main/resources/application.yml`

---

## Phase 5 — Frontend: BancaPage.jsx

**Archivo a crear:** `frontend/src/pages/Banca.jsx`  
**CSS a crear:** `frontend/src/styles/Banca.module.css`

### 5.1 Estructura de la página

La página tiene 3 secciones:
1. **Header** — título + subtítulo
2. **Panel de conexión** — estado + selector de banco + botón conectar/desconectar
3. **Lista de transacciones** — tabla con botón "Importar" por fila

### 5.2 Banca.jsx (estructura completa)

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../config/api';
import style from '../styles/Banca.module.css';

function Banca() {
  const [instituciones, setInstituciones]   = useState([]);
  const [conexion, setConexion]             = useState(null);  // BankConnectionResponse | null
  const [transacciones, setTransacciones]   = useState([]);
  const [seleccionado, setSeleccionado]     = useState('');
  const [cargando, setCargando]             = useState(false);
  const [error, setError]                   = useState('');
  const [importando, setImportando]         = useState(null); // id de tx importándose

  // Verificar si venimos de callback de Nordigen (?connected=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      cargarEstado();
    }
  }, []);

  const cargarInstituciones = useCallback(async () => {
    try {
      const data = await api.get('/bank/institutions');
      setInstituciones(data);
      if (data.length > 0) setSeleccionado(data[0].id);
    } catch { /* si falla, usar lista vacía */ }
  }, []);

  const cargarEstado = useCallback(async () => {
    try {
      const data = await api.get('/bank/status');
      setConexion(data);
      if (data?.status === 'LINKED') cargarTransacciones();
    } catch { setConexion(null); }
  }, []);

  const cargarTransacciones = useCallback(async () => {
    try {
      const data = await api.get('/bank/transactions');
      if (Array.isArray(data)) setTransacciones(data);
    } catch { /* ignorar */ }
  }, []);

  useEffect(() => {
    cargarInstituciones();
    cargarEstado();
  }, [cargarInstituciones, cargarEstado]);

  const handleConectar = async () => {
    if (!seleccionado) { setError('Selecciona un banco'); return; }
    setCargando(true); setError('');
    try {
      const data = await api.post('/bank/connect', {
        institutionId: seleccionado,
        redirectUrl: `${window.location.origin}/banco?connected=true`,
      });
      // Redirigir al link de autorización de Nordigen
      if (data.link) window.location.href = data.link;
    } catch (e) {
      setError(e.message || 'Error al conectar');
    } finally {
      setCargando(false);
    }
  };

  const handleDesconectar = async () => {
    if (!window.confirm('¿Desconectar tu cuenta bancaria?')) return;
    try {
      await api.delete('/bank/disconnect');
      setConexion(null);
      setTransacciones([]);
    } catch (e) {
      setError(e.message || 'Error al desconectar');
    }
  };

  const handleImportar = async (txId) => {
    setImportando(txId);
    try {
      await api.post(`/bank/transactions/${txId}/import`, {});
      setTransacciones(prev => prev.map(t =>
        t.id === txId ? { ...t, importedToPayflow: true } : t
      ));
    } catch (e) {
      alert('Error al importar: ' + e.message);
    } finally {
      setImportando(null);
    }
  };

  const vinculado = conexion?.status === 'LINKED';

  return (
    <div className={style.page}>
      <div className={style.container}>

        {/* Header */}
        <div className={style.header}>
          <h1 className={style.titulo}>Banca conectada</h1>
          <p className={style.subtitulo}>
            Conecta tu cuenta bancaria real y sincroniza tus transacciones automáticamente.
          </p>
        </div>

        {/* Panel conexión */}
        <div className={style.panelConexion}>
          <div className={style.estadoBadge}>
            <span className={vinculado ? style.estadoVinculado : style.estadoDesconectado}>
              {vinculado ? '✓ Banco vinculado' : '○ Sin banco conectado'}
            </span>
            {vinculado && conexion.institutionName && (
              <span className={style.nombreBanco}>{conexion.institutionName}</span>
            )}
          </div>

          {!vinculado ? (
            <div className={style.conectarForm}>
              <select
                value={seleccionado}
                onChange={e => setSeleccionado(e.target.value)}
                className={style.select}
              >
                {instituciones.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
              <button
                className={style.btnConectar}
                onClick={handleConectar}
                disabled={cargando}
              >
                {cargando ? 'Conectando...' : 'Conectar banco'}
              </button>
            </div>
          ) : (
            <button className={style.btnDesconectar} onClick={handleDesconectar}>
              Desconectar banco
            </button>
          )}

          {error && <p className={style.error}>{error}</p>}
        </div>

        {/* Transacciones bancarias */}
        {vinculado && (
          <div className={style.transaccionesPanel}>
            <div className={style.panelHeader}>
              <h2 className={style.panelTitulo}>Transacciones bancarias</h2>
              <button className={style.btnSincronizar} onClick={cargarTransacciones}>
                Actualizar
              </button>
            </div>

            {transacciones.length === 0 ? (
              <p className={style.vacio}>No hay transacciones sincronizadas aún.</p>
            ) : (
              <div className={style.lista}>
                {transacciones.map(tx => (
                  <div key={tx.id} className={`${style.item} ${tx.amount >= 0 ? style.itemIngreso : style.itemGasto}`}>
                    <div className={style.itemInfo}>
                      <span className={style.itemDesc}>{tx.description}</span>
                      <span className={style.itemFecha}>{tx.bookingDate}</span>
                    </div>
                    <span className={`${style.itemAmount} ${tx.amount >= 0 ? style.positivo : style.negativo}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount?.toFixed(2)} {tx.currency}
                    </span>
                    <button
                      className={`${style.btnImportar} ${tx.importedToPayflow ? style.importado : ''}`}
                      onClick={() => !tx.importedToPayflow && handleImportar(tx.id)}
                      disabled={tx.importedToPayflow || importando === tx.id}
                    >
                      {tx.importedToPayflow ? '✓ Importado' : importando === tx.id ? '...' : 'Importar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Banca;
```

### 5.3 Banca.module.css
Copiar estructura base de `Transacciones.module.css` y adaptar con estas clases adicionales:
- `.panelConexion` — card con border teal, padding 24px
- `.estadoBadge` — flex row con gap
- `.estadoVinculado` — color `#0891b2`, font-weight 600
- `.estadoDesconectado` — color `#9ca3af`
- `.btnConectar` — igual que `.btnNueva` (background `#0891b2`)
- `.btnDesconectar` — background `#ef4444`, color white
- `.item` — flex row, align-items center, gap 12px, background white, border-radius 12px, padding 14px 16px
- `.itemIngreso` — border-left 3px solid `#0891b2`
- `.itemGasto` — border-left 3px solid `#ef4444`
- `.positivo` — color `#0891b2`
- `.negativo` — color `#ef4444`
- `.btnImportar` — small button, background `#0891b2`, border-radius 8px
- `.importado` — background `#d1fae5`, color `#065f46`

---

## Phase 6 — Frontend: AutonomosPage.jsx

**Archivo a crear:** `frontend/src/pages/Autonomos.jsx`  
**CSS a crear:** `frontend/src/styles/Autonomos.module.css`

### 6.1 Estructura

La página tiene 3 tabs:
- **Facturas** — tabla + formulario nueva factura + botón PDF
- **Gastos** — tabla gastos deducibles + formulario nuevo gasto
- **Trimestre fiscal** — selector año/trimestre + dashboard con modelo 303/130

### 6.2 Autonomos.jsx (estructura completa)

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faFilePdf, faTrash } from '@fortawesome/free-solid-svg-icons';
import { api } from '../config/api';
import style from '../styles/Autonomos.module.css';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3);

function Autonomos() {
  const [tab, setTab]                       = useState('facturas');
  const [facturas, setFacturas]             = useState([]);
  const [gastos, setGastos]                 = useState([]);
  const [resumen, setResumen]               = useState(null);
  const [mostrarForm, setMostrarForm]       = useState(false);
  const [cargando, setCargando]             = useState(false);
  const [error, setError]                   = useState('');
  const [year, setYear]                     = useState(CURRENT_YEAR);
  const [quarter, setQuarter]               = useState(CURRENT_QUARTER);
  const [descargando, setDescargando]       = useState(null); // id de factura

  const [formFactura, setFormFactura] = useState({
    clienteNombre: '', clienteNif: '', concepto: '',
    baseImponible: '', tipoIva: 21, tipoIrpf: 15,
  });

  const [formGasto, setFormGasto] = useState({
    descripcion: '', proveedor: '', baseImponible: '', categoria: 'OTROS',
  });

  const cargarFacturas = useCallback(async () => {
    try { setFacturas(await api.get('/invoices')); } catch { /* ignorar */ }
  }, []);

  const cargarGastos = useCallback(async () => {
    try { setGastos(await api.get('/expenses')); } catch { /* ignorar */ }
  }, []);

  const cargarResumen = useCallback(async () => {
    try {
      setResumen(await api.get(`/invoices/summary/quarterly?year=${year}&quarter=${quarter}`));
    } catch { /* ignorar */ }
  }, [year, quarter]);

  useEffect(() => { cargarFacturas(); cargarGastos(); }, [cargarFacturas, cargarGastos]);
  useEffect(() => { if (tab === 'trimestre') cargarResumen(); }, [tab, cargarResumen]);

  const handleCrearFactura = async (e) => {
    e.preventDefault();
    if (!formFactura.clienteNombre || !formFactura.concepto || !formFactura.baseImponible) {
      setError('Rellena todos los campos obligatorios'); return;
    }
    setCargando(true); setError('');
    try {
      await api.post('/invoices', {
        ...formFactura,
        baseImponible: parseFloat(formFactura.baseImponible),
      });
      setMostrarForm(false);
      setFormFactura({ clienteNombre: '', clienteNif: '', concepto: '', baseImponible: '', tipoIva: 21, tipoIrpf: 15 });
      await cargarFacturas();
    } catch (e) {
      setError(e.message || 'Error al crear factura');
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarPdf = async (id, numero) => {
    setDescargando(id);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const res = await fetch(`${API_BASE}/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Error generando PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${numero}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e.message); }
    finally { setDescargando(null); }
  };

  const handleCancelarFactura = async (id) => {
    if (!window.confirm('¿Cancelar esta factura?')) return;
    try { await api.delete(`/invoices/${id}`); await cargarFacturas(); }
    catch (e) { alert(e.message); }
  };

  const handleCrearGasto = async (e) => {
    e.preventDefault();
    if (!formGasto.descripcion || !formGasto.baseImponible) return;
    try {
      await api.post('/expenses', { ...formGasto, baseImponible: parseFloat(formGasto.baseImponible) });
      setFormGasto({ descripcion: '', proveedor: '', baseImponible: '', categoria: 'OTROS' });
      await cargarGastos();
    } catch (e) { alert(e.message); }
  };

  const handleEliminarGasto = async (id) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try { await api.delete(`/expenses/${id}`); await cargarGastos(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div className={style.page}>
      <div className={style.container}>

        {/* Header */}
        <div className={style.header}>
          <h1 className={style.titulo}>Gestión Autónomos</h1>
          <p className={style.subtitulo}>Facturas, gastos deducibles y cálculo de impuestos trimestrales</p>
        </div>

        {/* Tabs */}
        <div className={style.tabs}>
          {['facturas','gastos','trimestre'].map(t => (
            <button
              key={t}
              className={`${style.tab} ${tab === t ? style.tabActivo : ''}`}
              onClick={() => { setTab(t); setMostrarForm(false); setError(''); }}
            >
              {t === 'facturas' ? `Facturas (${facturas.length})` : t === 'gastos' ? `Gastos (${gastos.length})` : 'Trimestre Fiscal'}
            </button>
          ))}
        </div>

        {error && <div className={style.errorGeneral}>{error}</div>}

        {/* ── TAB FACTURAS ── */}
        {tab === 'facturas' && (
          <div>
            <div className={style.tabHeader}>
              <span className={style.tabCount}>{facturas.length} facturas</span>
              <button className={style.btnNueva} onClick={() => setMostrarForm(!mostrarForm)}>
                <FontAwesomeIcon icon={faPlus} /> Nueva factura
              </button>
            </div>

            {mostrarForm && (
              <form onSubmit={handleCrearFactura} className={style.form}>
                <div className={style.formRow}>
                  <div className={style.formGroup}>
                    <label className={style.label}>Cliente *</label>
                    <input className={style.input} value={formFactura.clienteNombre}
                      onChange={e => setFormFactura(p => ({...p, clienteNombre: e.target.value}))}
                      placeholder="Nombre del cliente" required />
                  </div>
                  <div className={style.formGroup}>
                    <label className={style.label}>NIF cliente</label>
                    <input className={style.input} value={formFactura.clienteNif}
                      onChange={e => setFormFactura(p => ({...p, clienteNif: e.target.value}))}
                      placeholder="B12345678" />
                  </div>
                </div>
                <div className={style.formGroup}>
                  <label className={style.label}>Concepto *</label>
                  <input className={style.input} value={formFactura.concepto}
                    onChange={e => setFormFactura(p => ({...p, concepto: e.target.value}))}
                    placeholder="Descripción del servicio prestado" required />
                </div>
                <div className={style.formRow}>
                  <div className={style.formGroup}>
                    <label className={style.label}>Base imponible (€) *</label>
                    <input className={style.input} type="number" step="0.01" min="0"
                      value={formFactura.baseImponible}
                      onChange={e => setFormFactura(p => ({...p, baseImponible: e.target.value}))}
                      placeholder="1000.00" required />
                  </div>
                  <div className={style.formGroup}>
                    <label className={style.label}>IVA (%)</label>
                    <select className={style.select} value={formFactura.tipoIva}
                      onChange={e => setFormFactura(p => ({...p, tipoIva: Number(e.target.value)}))}>
                      <option value={21}>21%</option>
                      <option value={10}>10%</option>
                      <option value={4}>4%</option>
                      <option value={0}>0% (exento)</option>
                    </select>
                  </div>
                  <div className={style.formGroup}>
                    <label className={style.label}>IRPF (%)</label>
                    <select className={style.select} value={formFactura.tipoIrpf}
                      onChange={e => setFormFactura(p => ({...p, tipoIrpf: Number(e.target.value)}))}>
                      <option value={15}>15%</option>
                      <option value={7}>7% (primer año)</option>
                      <option value={0}>0% (no aplica)</option>
                    </select>
                  </div>
                </div>
                {/* Preview del total */}
                {formFactura.baseImponible && (
                  <div className={style.preview}>
                    <span>Base: {parseFloat(formFactura.baseImponible||0).toFixed(2)} €</span>
                    <span>+ IVA: {(parseFloat(formFactura.baseImponible||0) * formFactura.tipoIva/100).toFixed(2)} €</span>
                    <span>- IRPF: {(parseFloat(formFactura.baseImponible||0) * formFactura.tipoIrpf/100).toFixed(2)} €</span>
                    <strong>Total: {(parseFloat(formFactura.baseImponible||0) * (1 + formFactura.tipoIva/100 - formFactura.tipoIrpf/100)).toFixed(2)} €</strong>
                  </div>
                )}
                <div className={style.formBotones}>
                  <button type="button" className={style.btnCancelar} onClick={() => setMostrarForm(false)}>Cancelar</button>
                  <button type="submit" className={style.btnGuardar} disabled={cargando}>
                    {cargando ? 'Creando...' : 'Crear factura'}
                  </button>
                </div>
              </form>
            )}

            <div className={style.lista}>
              {facturas.length === 0 && <p className={style.vacio}>No hay facturas. Crea tu primera factura.</p>}
              {facturas.map(f => (
                <div key={f.id} className={`${style.item} ${f.estado === 'CANCELADA' ? style.cancelada : ''}`}>
                  <div className={style.itemInfo}>
                    <span className={style.itemNumero}>{f.numeroFactura}</span>
                    <span className={style.itemCliente}>{f.clienteNombre}</span>
                    <span className={style.itemConcepto}>{f.concepto}</span>
                  </div>
                  <div className={style.itemImportes}>
                    <span className={style.itemTotal}>{f.total?.toFixed(2)} €</span>
                    <span className={`${style.estadoBadge2} ${style['estado' + f.estado]}`}>{f.estado}</span>
                  </div>
                  <div className={style.itemAcciones}>
                    <button
                      className={style.btnPdf}
                      onClick={() => handleDescargarPdf(f.id, f.numeroFactura)}
                      disabled={descargando === f.id}
                      title="Descargar PDF"
                    >
                      <FontAwesomeIcon icon={faFilePdf} />
                    </button>
                    {f.estado !== 'CANCELADA' && (
                      <button className={style.btnEliminar} onClick={() => handleCancelarFactura(f.id)} title="Cancelar">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB GASTOS ── */}
        {tab === 'gastos' && (
          <div>
            <form onSubmit={handleCrearGasto} className={style.form}>
              <div className={style.formRow}>
                <div className={style.formGroup}>
                  <label className={style.label}>Descripción *</label>
                  <input className={style.input} value={formGasto.descripcion}
                    onChange={e => setFormGasto(p => ({...p, descripcion: e.target.value}))} required />
                </div>
                <div className={style.formGroup}>
                  <label className={style.label}>Proveedor</label>
                  <input className={style.input} value={formGasto.proveedor}
                    onChange={e => setFormGasto(p => ({...p, proveedor: e.target.value}))} />
                </div>
              </div>
              <div className={style.formRow}>
                <div className={style.formGroup}>
                  <label className={style.label}>Base imponible (€) *</label>
                  <input className={style.input} type="number" step="0.01" min="0"
                    value={formGasto.baseImponible}
                    onChange={e => setFormGasto(p => ({...p, baseImponible: e.target.value}))} required />
                </div>
                <div className={style.formGroup}>
                  <label className={style.label}>Categoría</label>
                  <select className={style.select} value={formGasto.categoria}
                    onChange={e => setFormGasto(p => ({...p, categoria: e.target.value}))}>
                    <option value="MATERIAL">Material</option>
                    <option value="SERVICIOS">Servicios</option>
                    <option value="SUMINISTROS">Suministros</option>
                    <option value="OTROS">Otros</option>
                  </select>
                </div>
              </div>
              <div className={style.formBotones}>
                <button type="submit" className={style.btnGuardar}>Añadir gasto</button>
              </div>
            </form>

            <div className={style.lista}>
              {gastos.length === 0 && <p className={style.vacio}>No hay gastos registrados.</p>}
              {gastos.map(g => (
                <div key={g.id} className={style.item}>
                  <div className={style.itemInfo}>
                    <span className={style.itemDesc}>{g.descripcion}</span>
                    <span className={style.itemCliente}>{g.proveedor}</span>
                    <span className={style.catBadge}>{g.categoria}</span>
                  </div>
                  <div className={style.itemImportes}>
                    <span className={style.montoGasto}>-{g.total?.toFixed(2)} €</span>
                    <span className={style.ivaTag}>IVA: {g.cuotaIva?.toFixed(2)} €</span>
                  </div>
                  <button className={style.btnEliminar} onClick={() => handleEliminarGasto(g.id)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB TRIMESTRE FISCAL ── */}
        {tab === 'trimestre' && (
          <div>
            <div className={style.trimestreSelector}>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className={style.select}>
                {[CURRENT_YEAR, CURRENT_YEAR-1, CURRENT_YEAR-2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select value={quarter} onChange={e => setQuarter(Number(e.target.value))} className={style.select}>
                <option value={1}>1T (Ene–Mar)</option>
                <option value={2}>2T (Abr–Jun)</option>
                <option value={3}>3T (Jul–Sep)</option>
                <option value={4}>4T (Oct–Dic)</option>
              </select>
              <button className={style.btnNueva} onClick={cargarResumen}>Calcular</button>
            </div>

            {resumen && (
              <div className={style.resumenGrid}>
                {/* Modelo 303 — IVA */}
                <div className={style.modeloCard}>
                  <h3 className={style.modeloTitulo}>Modelo 303 — IVA</h3>
                  <div className={style.modeloFila}>
                    <span>IVA repercutido (ventas)</span>
                    <span className={style.positivo}>+{resumen.ivaRepercutido?.toFixed(2)} €</span>
                  </div>
                  <div className={style.modeloFila}>
                    <span>IVA soportado (compras)</span>
                    <span className={style.negativo}>-{resumen.ivaSoportado?.toFixed(2)} €</span>
                  </div>
                  <div className={`${style.modeloFila} ${style.modeloTotal}`}>
                    <span>A pagar a Hacienda</span>
                    <span className={resumen.resultado303 >= 0 ? style.alerta : style.positivo}>
                      {resumen.resultado303?.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Modelo 130 — IRPF */}
                <div className={style.modeloCard}>
                  <h3 className={style.modeloTitulo}>Modelo 130 — IRPF</h3>
                  <div className={style.modeloFila}>
                    <span>Ingresos del trimestre</span>
                    <span>{resumen.totalIngresos?.toFixed(2)} €</span>
                  </div>
                  <div className={style.modeloFila}>
                    <span>Retenciones practicadas</span>
                    <span>-{resumen.retencionesIRPF?.toFixed(2)} €</span>
                  </div>
                  <div className={`${style.modeloFila} ${style.modeloTotal}`}>
                    <span>Pago fraccionado</span>
                    <span className={resumen.pagoFraccionado130 > 0 ? style.alerta : style.positivo}>
                      {resumen.pagoFraccionado130?.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Resumen total */}
                <div className={style.totalCard}>
                  <h3>Total a pagar este trimestre</h3>
                  <span className={style.totalGrande}>
                    {((resumen.resultado303 || 0) + (resumen.pagoFraccionado130 || 0)).toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Autonomos;
```

### 6.3 Autonomos.module.css
Copiar de `Transacciones.module.css` y añadir:
- `.tabs` — flex row, gap 4px, background `#f3f4f6`, padding 4px, border-radius 12px
- `.tab` — padding 10px 20px, border none, background none, border-radius 8px, cursor pointer
- `.tabActivo` — background `#0891b2`, color white, font-weight 600
- `.tabHeader` — flex row, justify-content space-between, align-items center
- `.preview` — flex row, gap 16px, background `#f0f9ff`, border-radius 8px, padding 12px 16px, font-size 0.875rem
- `.resumenGrid` — grid, `grid-template-columns: 1fr 1fr`, gap 16px
- `.modeloCard` — background white, border-radius 12px, padding 20px, box-shadow
- `.modeloTitulo` — font-size 1rem, font-weight 700, color `#0891b2`, margin-bottom 16px
- `.modeloFila` — flex row, justify-content space-between, padding 8px 0, border-bottom 1px solid `#f3f4f6`
- `.modeloTotal` — font-weight 700, border-top 2px solid `#e5e7eb`, padding-top 12px
- `.totalCard` — grid-column 1/-1, background `#0891b2`, color white, border-radius 12px, padding 20px, text-align center
- `.totalGrande` — font-size 2.5rem, font-weight 800
- `.alerta` — color `#dc2626`
- `.estadoPENDIENTE` — color `#f59e0b`, `.estadoCOBRADA` — color `#0891b2`, `.estadoCANCELADA` — color `#9ca3af`
- `.ivaTag` — small tag, color gris, font-size 0.8rem

---

## Phase 7 — Actualizar App.jsx y Navbar.jsx

### 7.1 Editar `frontend/src/App.jsx`

Añadir imports:
```jsx
import Banca from './pages/Banca'
import Autonomos from './pages/Autonomos'
```

Añadir rutas DENTRO de `<Routes>` (junto a `/crypto`):
```jsx
<Route
  path="/banco"
  element={<ProtectedRoute><Banca /></ProtectedRoute>}
/>
<Route
  path="/autonomos"
  element={<ProtectedRoute><Autonomos /></ProtectedRoute>}
/>
```

Añadir `/banco` y `/autonomos` a `RUTAS_PUBLICAS` si no deben mostrar Navbar (no necesario — son rutas protegidas con Navbar).

### 7.2 Editar `frontend/src/components/Navbar.jsx`

Añadir después del link de Crypto:
```jsx
<NavLink
  to="/banco"
  className={({ isActive }) =>
    isActive ? `${style.link} ${style.linkActivo}` : style.link
  }
>
  Banca
</NavLink>
<NavLink
  to="/autonomos"
  className={({ isActive }) =>
    isActive ? `${style.link} ${style.linkActivo}` : style.link
  }
>
  Autónomos
</NavLink>
```

**Verificación Phase 7:**
- `npm run dev` inicia sin errores de compilación
- `/banco` muestra el panel de conexión bancaria
- `/autonomos` muestra las 3 tabs
- Navbar muestra links a Banca y Autónomos

---

## Orden de Ejecución

| Phase | Archivo(s) | Tiempo estimado |
|-------|-----------|----------------|
| 1 | `TradingService.java` (editar) | 5 min |
| 2 | `backend/bank-service/` (crear completo) | 30 min |
| 3 | `backend/invoicing-service/` (crear completo) | 30 min |
| 4 | `application.yml` + `init.sql` (editar) | 5 min |
| 5 | `Banca.jsx` + `Banca.module.css` (crear) | 20 min |
| 6 | `Autonomos.jsx` + `Autonomos.module.css` (crear) | 25 min |
| 7 | `App.jsx` + `Navbar.jsx` (editar) | 5 min |

**Total estimado: ~2 horas**

## Checklist de Verificación Final

```bash
# Backend builds
cd backend/trading-service && mvn clean package -DskipTests  # debe pasar
cd backend/bank-service && mvn clean package -DskipTests     # debe pasar
cd backend/invoicing-service && mvn clean package -DskipTests # debe pasar
cd backend/api-gateway && mvn clean package -DskipTests      # debe pasar

# Anti-patterns
grep -r "actualizarPortfolio" backend/trading-service/       # 0 resultados
grep -r "WebSecurityConfigurerAdapter" backend/              # 0 resultados

# Frontend
cd frontend && npm run build                                  # debe pasar sin errores
```
