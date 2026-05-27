# PayFlow — Memoria Técnica Sprint 2

**Fecha de redacción:** 27 de mayo de 2026  
**Autor:** Iker Martínez Velasco  
**Módulo:** Desarrollo de Aplicaciones Web (DAW) — TFG

---

## 1. Introducción

El Sprint 2 de PayFlow amplía la plataforma financiera añadiendo tres bloques funcionales nuevos:

| Módulo | Descripción |
|--------|-------------|
| **Wallet digital** | Saldo EUR por usuario, transferencias P2P e historial de movimientos con libro mayor de doble entrada |
| **Banca conectada** | Integración con la API Nordigen (GoCardless) para vincular cuentas bancarias reales y sincronizar transacciones |
| **Gestión de autónomos** | Facturación electrónica, registro de gastos deducibles, cálculo de impuestos trimestrales (IVA Modelo 303 + IRPF Modelo 130) y generación de PDF |

---

## 2. Arquitectura del sistema (versión Sprint 2)

```
Browser (localhost:5173)
        │
        ▼
 API Gateway :8080
   ├─ CORS para localhost:5173
   ├─ JwtAuthFilter (rutas protegidas)
   └─ Load balancing vía Eureka
        │
   ┌────┴────────────────────────────────────────────────────┐
   │                                                         │
   ▼                   ▼                   ▼                 ▼
auth-service     transaction-service  wallet-service   bank-service
   :8081              :8082              :8083            :8085
  auth_db          transactions_db     wallet_db         bank_db
                                                            │
   ▼                                                        │
discovery-service                                           │
   :8761 (Eureka)                                   invoicing-service
                                                       :8086
                                                    invoicing_db
```

### 2.1 Nuevos microservicios en Sprint 2

| Servicio | Puerto | Base de datos | Responsabilidad |
|----------|--------|--------------|-----------------|
| `wallet-service` | 8083 | `wallet_db` | Saldo EUR, transferencias P2P, ledger de doble entrada |
| `bank-service` | 8085 | `bank_db` | Conexión bancaria vía Nordigen, sincronización de transacciones |
| `invoicing-service` | 8086 | `invoicing_db` | Facturas, gastos, resumen trimestral, PDF con iText7 |

### 2.2 Rutas del API Gateway (Sprint 2)

El fichero `backend/api-gateway/src/main/resources/application.yml` recibe las siguientes rutas nuevas:

```yaml
# Wallet — requiere JWT
- id: wallet
  uri: lb://wallet-service
  predicates:
    - Path=/wallet/**
  filters:
    - name: JwtAuthFilter

# Banca — callback público, resto con JWT
- id: bank-public
  uri: lb://bank-service
  predicates:
    - Path=/bank/callback, /bank/institutions

- id: bank
  uri: lb://bank-service
  predicates:
    - Path=/bank/**
  filters:
    - name: JwtAuthFilter

# Facturación — requiere JWT
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

> **Nota importante:** La ruta `bank-public` debe estar **antes** de `bank` en el YAML porque Spring Cloud Gateway evalúa las rutas en orden y la primera que coincide gana. El callback de Nordigen (`/bank/callback`) es público —no requiere JWT— ya que el usuario llega desde un redireccionamiento externo.

---

## 3. Wallet Service

### 3.1 Descripción

El `wallet-service` implementa una **cartera digital en EUR** para cada usuario de PayFlow. El saldo se gestiona mediante un **libro mayor de doble entrada** (double-entry ledger), patrón contable estándar que garantiza la integridad de los datos: cada transferencia genera exactamente dos asientos —un DEBIT en el remitente y un CREDIT en el destinatario.

### 3.2 Modelo de datos

```
┌─────────────────────────────┐        ┌───────────────────────────────────────┐
│         wallets             │        │           ledger_entries              │
├─────────────────────────────┤        ├───────────────────────────────────────┤
│ id (UUID PK)                │◄───────┤ walletId (FK)                         │
│ userId (UNIQUE)             │        │ userId                                │
│ balance (DECIMAL)           │        │ type (DEBIT | CREDIT)                 │
│ currency (EUR)              │        │ amount                                │
│ createdAt                   │        │ balanceAfter                          │
└─────────────────────────────┘        │ description                           │
                                       │ counterpartyUserId                    │
                                       │ correlationId (idempotencia)          │
                                       │ createdAt                             │
                                       └───────────────────────────────────────┘
```

### 3.3 Endpoints REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/wallet/me` | Obtiene saldo y datos de la wallet. La crea con 50 EUR si es el primer acceso. |
| `GET` | `/wallet/movements` | Historial de movimientos ordenado del más reciente al más antiguo. |
| `POST` | `/wallet/send` | Transfiere dinero a otro usuario. Soporta idempotencia con `Idempotency-Key`. |

### 3.4 Idempotencia en transferencias

El endpoint `POST /wallet/send` acepta el header opcional `Idempotency-Key`. Si el cliente reenvía la misma petición con el mismo valor del header (p.ej., por un timeout de red), el servicio detecta que ya existe un asiento con ese `correlationId` y **devuelve el resultado anterior sin repetir la operación**, evitando duplicar transferencias.

```java
// Si ya existe un asiento con este correlationId → retornar sin operar
var existing = ledgerRepository.findFirstByCorrelationIdAndUserId(correlation, fromUserId);
if (existing.isPresent()) {
    WalletEntity w = walletRepository.findByUserId(fromUserId).orElseThrow();
    return new WalletResponse(w);
}
```

### 3.5 Auto-provisioning

Cuando un usuario accede por primera vez a su wallet (o cuando es destinatario de un envío y no tiene wallet aún), el sistema la crea automáticamente con **50 EUR de saldo de bienvenida**:

```java
WalletEntity wallet = walletRepository.findByUserId(userId)
        .orElseGet(() -> crearWalletConBienvenida(userId));
```

### 3.6 Transaccionalidad

El método `send()` está anotado con `@Transactional`. Si falla cualquier paso (actualización de saldo del remitente, del destinatario, o inserción de cualquier asiento del ledger), la operación completa se revierte, manteniendo la coherencia del sistema.

### 3.7 Estructura del proyecto

```
backend/wallet-service/
├── pom.xml
└── src/main/
    ├── java/com/payflow/wallet/
    │   ├── WalletApplication.java
    │   ├── controller/WalletController.java
    │   ├── dto/
    │   │   ├── WalletResponse.java
    │   │   ├── LedgerEntryResponse.java
    │   │   └── SendMoneyRequest.java
    │   ├── entity/
    │   │   ├── WalletEntity.java
    │   │   └── LedgerEntry.java          (enum Type: DEBIT, CREDIT)
    │   ├── repository/
    │   │   ├── WalletRepository.java
    │   │   └── LedgerEntryRepository.java
    │   ├── service/WalletService.java
    │   └── config/GlobalExceptionHandler.java
    └── resources/application.properties
```

---

## 4. Bank Service

### 4.1 Descripción

El `bank-service` integra PayFlow con la **API Nordigen de GoCardless** (Open Banking PSD2 estándar) para permitir al usuario vincular su cuenta bancaria real y sincronizar automáticamente sus transacciones bancarias dentro de la plataforma.

Incluye un **modo demo** completo que devuelve datos ficticios cuando las credenciales Nordigen son `demo`, permitiendo probar toda la funcionalidad sin credenciales reales de Open Banking.

### 4.2 Flujo de conexión bancaria (OAuth2-like)

```
1. Usuario elige banco en PayFlow
           │
           ▼
2. PayFlow → POST /bank/connect → bank-service crea una "requisition" en Nordigen
           │
           ▼ (Nordigen devuelve link de autorización)
3. PayFlow redirige al usuario al portal del banco
           │
           ▼ (usuario autoriza en su banco)
4. Nordigen redirige al usuario de vuelta a /banco?connected=true
           │
           ▼
5. PayFlow → GET /bank/callback → bank-service actualiza el estado a LINKED
           │
           ▼
6. Usuario puede ver y sincronizar transacciones: GET /bank/transactions
```

### 4.3 Modelo de datos

```
┌─────────────────────────────────┐    ┌───────────────────────────────────┐
│       bank_connections          │    │       bank_transactions           │
├─────────────────────────────────┤    ├───────────────────────────────────┤
│ id (UUID)                       │    │ id (UUID)                         │
│ userId                          │    │ userId                            │
│ requisitionId (Nordigen)        │    │ bankConnectionId (FK)             │
│ institutionId                   │    │ externalId (ID en Nordigen)       │
│ institutionName                 │    │ amount                            │
│ status (PENDING|LINKED|EXPIRED) │    │ currency                          │
│ link (URL autorización)         │    │ description                       │
│ createdAt                       │    │ bookingDate                       │
└─────────────────────────────────┘    │ importedToPayflow (boolean)       │
                                       └───────────────────────────────────┘
```

### 4.4 Endpoints REST

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/bank/institutions` | ❌ público | Lista bancos disponibles (España) |
| `POST` | `/bank/connect` | ✅ JWT | Inicia conexión con un banco |
| `GET` | `/bank/status` | ✅ JWT | Estado de la conexión actual |
| `GET` | `/bank/callback` | ❌ público | Callback tras autorización en el banco |
| `GET` | `/bank/transactions` | ✅ JWT | Sincroniza y devuelve transacciones |
| `POST` | `/bank/transactions/{id}/import` | ✅ JWT | Importa transacción a PayFlow |
| `DELETE` | `/bank/disconnect` | ✅ JWT | Desconecta el banco |

### 4.5 Modo Demo

Cuando `nordigen.secret-id=demo` (valor por defecto en `application.properties`), el `NordigenClient` devuelve datos ficticios sin llamar a la API real:

- **Instituciones:** Santander, BBVA, CaixaBank (demo)
- **Transacciones:** 3 operaciones de ejemplo (supermercado, nómina, suscripciones)
- **Requisition:** ID y link de autorización ficticios

Esto permite demostrar la funcionalidad completa del flujo de Open Banking en el TFG sin necesidad de credenciales reales.

---

## 5. Invoicing Service

### 5.1 Descripción

El `invoicing-service` proporciona herramientas de gestión fiscal para **trabajadores autónomos**:

- Creación y gestión de **facturas** con cálculo automático de IVA e IRPF
- Registro de **gastos deducibles** clasificados por categoría
- **Resumen trimestral** con los datos necesarios para cumplimentar los modelos fiscales 303 (IVA) y 130 (IRPF fraccionado)
- **Generación de PDF** de facturas con diseño corporativo PayFlow usando la biblioteca iText7

### 5.2 Modelo fiscal implementado

#### Factura

```
Base imponible: 1.000 €
+ IVA (21%):    + 210 €
- IRPF (15%):   - 150 €
─────────────────────────
Total a cobrar:  1.060 €
```

El IVA y el IRPF son configurables por factura (IVA: 0%, 4%, 10%, 21%; IRPF: 0%, 7%, 15%).

#### Resumen trimestral

| Modelo | Cálculo |
|--------|---------|
| **Modelo 303 (IVA)** | IVA repercutido (ventas) − IVA soportado (compras deducibles) |
| **Modelo 130 (IRPF)** | max(0, beneficio_neto × 20% − retenciones_ya_practicadas) |

### 5.3 Numeración automática de facturas

El servicio asigna automáticamente números de factura con el formato `F-{año}-{número}` (ej: `F-2026-001`), contando las facturas no canceladas del usuario en el año en curso:

```java
private String generarNumero(String userId) {
    int year = LocalDate.now().getYear();
    long count = invoiceRepo.countByUserIdAndFechaYear(userId, year);
    return String.format("F-%d-%03d", year, count + 1);
}
```

### 5.4 Generación de PDF con iText7

Las facturas se pueden descargar en PDF mediante `GET /invoices/{id}/pdf`. El PDF se genera en memoria con **iText7 8.0.4** (misma versión que el resto del proyecto) y se devuelve como `application/pdf` en el body de la respuesta. El frontend crea un enlace temporal (`URL.createObjectURL`) para descargarlo automáticamente:

```javascript
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = `${numero}.pdf`; a.click();
URL.revokeObjectURL(url);
```

### 5.5 Endpoints REST

#### Facturas (`/invoices`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/invoices` | Crear nueva factura |
| `GET` | `/invoices` | Listar facturas del usuario |
| `GET` | `/invoices/{id}` | Detalle de una factura |
| `DELETE` | `/invoices/{id}` | Cancelar factura (estado CANCELADA) |
| `GET` | `/invoices/{id}/pdf` | Descargar PDF de la factura |
| `GET` | `/invoices/summary/quarterly` | Resumen fiscal trimestral (`?year=2026&quarter=1`) |

#### Gastos (`/expenses`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/expenses` | Registrar nuevo gasto |
| `GET` | `/expenses` | Listar gastos del usuario |
| `DELETE` | `/expenses/{id}` | Eliminar gasto |

---

## 6. Frontend — Nuevas páginas (Sprint 2)

### 6.1 Wallet.jsx (`/wallet`)

Página funcional que se conecta al `wallet-service` real. Sustituye al placeholder "en construcción" de Sprint 1.

**Funcionalidades:**
- Muestra el saldo disponible en EUR (con auto-provisioning en el primer acceso)
- Lista el historial de movimientos con tipo, descripción, contraparte y saldo resultante
- Modal de envío de dinero con validación de campos y gestión de errores
- Botón "Enviar" habilitado; resto de acciones (Pedir, QR, Link) marcados como "próximamente"

**Patrones React utilizados:**
- `useState` para gestión local de estado (wallet, movimientos, formulario, modal)
- `useCallback` + `useEffect` para la carga inicial con memoización
- `Promise.all` para cargar wallet y movimientos en paralelo

```javascript
const loadWallet = useCallback(async () => {
  const [w, m] = await Promise.all([
    api.get("/wallet/me"),
    api.get("/wallet/movements"),
  ]);
  setWallet(w);
  setMovements(Array.isArray(m) ? m : []);
}, []);
```

### 6.2 Banca.jsx (`/banco`)

Página de conexión con Open Banking. Implementa el flujo OAuth2-like descrito en el apartado 4.2.

**Funcionalidades:**
- Selección de banco (lista dinámica desde `/bank/institutions`)
- Estado de la conexión con badge visual (vinculado / sin conexión)
- Lista de transacciones bancarias con botón "Importar" por fila
- Detección automática del callback de Nordigen (`?connected=true`)
- Botón de desconexión con confirmación

### 6.3 Autonomos.jsx (`/autonomos`)

Panel de gestión fiscal con tres pestañas:

| Pestaña | Contenido |
|---------|-----------|
| **Facturas** | Listado + formulario de nueva factura + descarga PDF |
| **Gastos** | Registro de gastos deducibles con categoría |
| **Trimestre Fiscal** | Selector año/trimestre + dashboard Modelo 303 y 130 |

**Funcionalidades destacadas:**
- Preview en tiempo real del total de la factura mientras se escribe la base imponible
- Formateo automático de números con 2 decimales
- Resumen fiscal con colores de alerta cuando hay cantidad a pagar a Hacienda

### 6.4 Navbar actualizada

El menú de navegación incluye ahora los enlaces a todas las secciones del Sprint 2:

```
Inicio | Wallet | Transacciones | Banca | Autónomos | [Admin]
```

---

## 7. Infraestructura y despliegue

### 7.1 Base de datos (`backend/init.sql`)

El script de inicialización crea las 5 bases de datos del proyecto:

```sql
CREATE DATABASE auth_db;
CREATE DATABASE transactions_db;
CREATE DATABASE bank_db;
CREATE DATABASE invoicing_db;
CREATE DATABASE wallet_db;
```

### 7.2 Docker Compose (`backend/docker-compose.yml`)

El fichero `docker-compose.yml` define todos los servicios del sistema con sus dependencias de arranque. El healthcheck de PostgreSQL usa `pg_isready -U payflow` para garantizar que la base de datos está lista antes de arrancar los microservicios.

```
Orden de arranque:
postgres → discovery-service → auth-service
                             → transaction-service
                             → wallet-service
                             → bank-service
                             → invoicing-service
         → api-gateway (depende solo de discovery-service)
```

### 7.3 Dockerfiles

Cada microservicio tiene un `Dockerfile` basado en `eclipse-temurin:21-jre-alpine` (imagen oficial de Java 21 LTS optimizada):

```dockerfile
FROM eclipse-temurin:21-jre-alpine
COPY target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

El build de los JARs se realiza previamente con `mvn clean package -DskipTests` antes de construir las imágenes Docker.

### 7.4 Servicios y puertos

| Servicio | Puerto local | Descripción |
|----------|-------------|-------------|
| PostgreSQL | 5432 | Base de datos compartida (instancia única, múltiples DBs) |
| Eureka (discovery-service) | 8761 | Registro de microservicios |
| API Gateway | 8080 | Punto de entrada único para el frontend |
| auth-service | 8081 | Autenticación y gestión de usuarios |
| transaction-service | 8082 | Transacciones financieras (ingresos/gastos) |
| wallet-service | 8083 | Wallet digital EUR |
| bank-service | 8085 | Open Banking (Nordigen) |
| invoicing-service | 8086 | Facturación autónomos |
| Frontend (Vite dev) | 5173 | Aplicación React |

---

## 8. Tecnologías nuevas incorporadas en Sprint 2

| Tecnología | Versión | Uso |
|------------|---------|-----|
| iText7 | 8.0.4 | Generación de PDF de facturas |
| Nordigen API | v2 | Open Banking — conexión cuentas bancarias |
| Spring WebFlux (WebClient) | (vía Boot 3.3.0) | Cliente HTTP reactivo para llamadas a Nordigen |

---

## 9. Patrones y decisiones técnicas

### 9.1 Double-entry ledger (libro mayor de doble entrada)

El sistema de wallet utiliza un ledger de doble entrada en lugar de simplemente almacenar el saldo como un número. Cada operación crea dos registros en `ledger_entries`:

- Un **DEBIT** (salida) en la cuenta del remitente
- Un **CREDIT** (entrada) en la cuenta del destinatario

Esto garantiza que la suma de todos los DEBITs y CREDITs del sistema sea siempre cero (principio contable), y permite auditar completamente el historial de cualquier wallet.

### 9.2 Sin Spring Security en los nuevos microservicios

Los microservicios `wallet-service`, `bank-service` e `invoicing-service` **no incluyen Spring Security**. La autenticación y autorización la realiza el API Gateway, que:
1. Valida el JWT
2. Extrae el `userId` del claim del token
3. Lo inyecta como header `X-User-Id` en la petición dirigida al microservicio

Los microservicios simplemente leen el header `@RequestHeader("X-User-Id")`, confiando en que el gateway ya validó la identidad. Esto evita duplicar lógica de seguridad y sigue el principio de responsabilidad única.

### 9.3 Auto-provisioning de wallets

No existe un endpoint explícito de "crear wallet". En su lugar, cualquier acceso a `/wallet/me` o cualquier transferencia entrante crea automáticamente la wallet si no existe. Esto simplifica la integración: el frontend no necesita gestionar un paso de "activar wallet".

### 9.4 Modo demo de Nordigen

Para facilitar la demostración del TFG sin credenciales reales de Open Banking, el `NordigenClient` detecta `nordigen.secret-id=demo` y devuelve datos ficticios realistas. Este patrón evita que el proyecto requiera infraestructura externa para funcionar.

---

## 10. Cómo arrancar el proyecto (Sprint 2)

### Prerrequisitos

- Java 21 (o 25) + Maven 3.9
- PostgreSQL 16+ corriendo en `localhost:5432`
- Usuario PostgreSQL: `payflow` / `payflow123`
- Node.js 20+ para el frontend

### Opción A — Arranque manual (desarrollo)

```bash
# 1. Inicializar las bases de datos (ejecutar una sola vez)
psql -U payflow -f backend/init.sql

# 2. Eureka
cd backend/discovery-service && mvn spring-boot:run

# 3. Servicios (en paralelo o en orden)
cd backend/auth-service        && mvn spring-boot:run
cd backend/transaction-service && mvn spring-boot:run
cd backend/wallet-service      && mvn spring-boot:run
cd backend/bank-service        && mvn spring-boot:run
cd backend/invoicing-service   && mvn spring-boot:run

# 4. API Gateway (esperar a que los servicios estén en Eureka)
cd backend/api-gateway && mvn spring-boot:run

# 5. Frontend
cd frontend && npm run dev
```

### Opción B — Docker Compose

```bash
# Compilar todos los JARs primero
cd backend/discovery-service  && mvn clean package -DskipTests
cd backend/auth-service        && mvn clean package -DskipTests
cd backend/transaction-service && mvn clean package -DskipTests
cd backend/wallet-service      && mvn clean package -DskipTests
cd backend/bank-service        && mvn clean package -DskipTests
cd backend/invoicing-service   && mvn clean package -DskipTests
cd backend/api-gateway         && mvn clean package -DskipTests

# Levantar todo el stack
cd backend && docker-compose up --build
```

### URLs de acceso

| URL | Descripción |
|-----|-------------|
| http://localhost:5173 | Frontend React |
| http://localhost:8080 | API Gateway (entrada única) |
| http://localhost:8761 | Panel Eureka (microservicios registrados) |

---

## 11. Flujo de prueba funcional

### 11.1 Wallet (P2P)

1. Registrar dos usuarios: `alice` y `bob`
2. Login como `alice` → `GET /wallet/me` → saldo inicial 50 EUR
3. `POST /wallet/send` con body `{ "toUserId": "<id-bob>", "amount": 10, "description": "Cena" }`
4. Verificar: alice tiene 40 EUR, bob tiene 60 EUR
5. `GET /wallet/movements` → ver los dos asientos en el ledger

### 11.2 Banca conectada (modo demo)

1. Login → `/banco` en el frontend
2. Seleccionar "Santander (Demo)" y pulsar "Conectar banco"
3. Se redirige a `https://example.com/sandbox-consent` (demo)
4. El callback actualiza el estado a `LINKED`
5. `GET /bank/transactions` → devuelve 3 transacciones de ejemplo
6. Pulsar "Importar" en cualquier transacción

### 11.3 Autónomos

1. Login → `/autonomos` → pestaña "Facturas"
2. Crear factura: Cliente "Tech Corp", Base 1000€, IVA 21%, IRPF 15%
3. Verificar numeración automática `F-2026-001`
4. Descargar PDF → verificar documento con datos del cliente y totales
5. Pestaña "Trimestre Fiscal" → seleccionar Q2 2026 → ver resumen Modelo 303/130

---

## 12. Checklist de verificación

```
Backend (compilación):
[✓] mvn clean package -DskipTests → wallet-service
[✓] mvn clean package -DskipTests → bank-service
[✓] mvn clean package -DskipTests → invoicing-service
[✓] mvn clean package -DskipTests → api-gateway (con nuevas rutas)

Frontend (compilación):
[✓] npm run build → 0 errores

Integración (rutas gateway):
[✓] /wallet/** → wallet-service (con JwtAuthFilter)
[✓] /bank/institutions, /bank/callback → bank-service (sin JWT)
[✓] /bank/** → bank-service (con JwtAuthFilter)
[✓] /invoices/**, /expenses/** → invoicing-service (con JwtAuthFilter)

Frontend (navegación):
[✓] /wallet → Wallet.jsx funcional (saldo real + movimientos + envío P2P)
[✓] /banco → Banca.jsx (conexión bancaria modo demo)
[✓] /autonomos → Autonomos.jsx (facturas, gastos, trimestre fiscal)
[✓] Navbar → links Wallet | Banca | Autónomos visibles

Infraestructura:
[✓] init.sql → 5 bases de datos creadas
[✓] docker-compose.yml → 7 servicios + postgres
[✓] Dockerfiles → bank-service, invoicing-service, wallet-service
```
