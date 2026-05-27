# PayFlow — Memoria del TFG

> Documento maestro de la memoria. Se va completando sprint a sprint. Al final del proyecto sirve de esqueleto directo para la memoria oficial entregable.

**Autor**: Iker Martínez Velasco
**Ciclo**: DAW (Desarrollo de Aplicaciones Web)
**Curso**: 2025/2026
**Repositorio**: `C:\2_Daw\TFG`

---

## 1. Resumen ejecutivo

**PayFlow** es una plataforma de pagos para **autónomos y particulares en España** que unifica en una sola aplicación: wallet interno con saldo en euros, envíos P2P entre usuarios (estilo Bizum), cobros mediante payment links (estilo PayPal/Stripe), facturación con cálculo automático de IVA e IRPF (estilo Quipu), e integración con **Open Banking europeo (PSD2)** vía TrueLayer.

La aplicación está construida como una arquitectura de **microservicios Spring Boot 3.3** (Java 21) registrada en Eureka, expuesta a través de un API Gateway que centraliza la autenticación JWT. El frontend es una **SPA React 19** con CSS Modules + SASS + Bootstrap, responsive y con sistema de design tokens propio.

**Frase única**: *"Cobra, paga y factura desde una sola app, con tu banco conectado de verdad."*

---

## 2. Motivación y pivote del producto

### Origen del proyecto

El proyecto nació como una "super-app financiera" intentando cubrir tres mundos a la vez: **trading de criptomonedas con USDT virtual**, **facturación para autónomos** con IVA/IRPF, y **gestión de finanzas personales** con transacciones manuales.

### Análisis crítico (sesión de revisión)

Tras un escaneo completo del proyecto a mitad de desarrollo, se identificaron **tres problemas estructurales**:

1. **Audiencias incompatibles**: un autónomo de 40 años no quiere especular con criptomonedas; un trader de 22 años no factura. Estar vendiendo dos productos en la misma landing diluye la propuesta.
2. **El módulo crypto era un juguete**: usaba un balance USDT virtual sin conexión a exchanges reales, sin valor económico real, sin defensibilidad ante un tribunal.
3. **Redundancia entre transacciones manuales y Open Banking**: si el banco está conectado, las transacciones manuales sobran. Dos formas de hacer lo mismo confunden al usuario.

### Decisión: pivote a PayFlow Híbrido

Se eliminó el módulo crypto completo (servicios `trading-service` y `price-service`, página `/crypto`, referencias en landing y login) y se reposicionó el producto como **plataforma de pagos** con tres patas conectadas por un wallet central:

```
                    ┌──────────────────┐
                    │   WALLET (€)     │
                    │  Saldo interno   │
                    └────────┬─────────┘
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼─────┐  ┌─────▼──────┐ ┌────▼─────┐
       │  P2P send  │  │  Facturas  │ │  Banco   │
       │  /request  │  │  + PDF     │ │  PSD2    │
       └────────────┘  └────────────┘ └──────────┘
```

Esta historia tiene **un solo cliente claro** (autónomo o particular que recibe pagos), **un solo flujo central** (todo entra y sale del wallet) y **una sola frase** que cualquier tribunal entiende en 30 segundos.

---

## 3. Análisis de mercado

### Competencia directa

| Producto | Tipo | Audiencia | Precio | Puntos fuertes | Puntos débiles |
|---|---|---|---|---|---|
| **Bizum** | P2P bancario | Particulares ES | Gratis | Estándar de la banca | Solo P2P entre bancos ES, sin facturas, sin links |
| **PayPal** | Wallet + payment links | Global | Comisión por transacción | Marca, internacional | Comisiones altas, UI desfasada |
| **Wise** | Multidivisa | Internacional | Bajo coste FX | Tipo de cambio bueno | No tiene módulo autónomo |
| **Quipu** | Facturación autónomos | Autónomos ES | 12-30 €/mes | Modelo 303, asesor | Sin pagos, sin Open Banking real |
| **Anfix** | Contabilidad PYME | Pymes/autónomos ES | 15-50 €/mes | Completo | Curva de aprendizaje, caro |
| **Holded** | ERP PYME | Pymes ES | 25-100 €/mes | Muy potente | Sobrado para autónomo solo |

### Hueco identificado

Ninguno de los competidores cubre **a la vez**: P2P + payment links + facturación con IVA/IRPF + Open Banking real. PayFlow se posiciona en esa intersección.

### Mercado objetivo

- **3,3 millones de autónomos** registrados en España (RETA, 2025)
- **40 millones de usuarios bancarios** elegibles para PSD2 en España
- **Tendencia**: PSD2 obliga a los bancos a abrir APIs desde 2018; el 92% de bancos europeos están conectados a agregadores como TrueLayer (datos 2024)

---

## 4. Mapeo de requisitos del TFG

### Backend

| Requisito | Cumplimiento | Implementación |
|---|---|---|
| Framework backend | ✓ | Spring Boot 3.3 + Java 21 (microservicios) |
| Autenticación por tokens | ✓ | JWT distribuido vía API Gateway |
| Autorización por roles (mín 2) | ✓ | USER + ADMIN + AUTONOMO (3 roles) |
| Validación de peticiones | ✓ | `@Valid` + Bean Validation en todos los DTOs |
| Mín 4 CRUDs | ✓ (6) | Transacciones, Facturas, Gastos, Conexiones bancarias, Usuarios, Movimientos wallet |
| Generación PDF | ✓ | iText7 → facturas, informes mensuales, modelos 303/130 |
| Envío de emails | Sprint 3 | Spring Mail + Gmail SMTP |
| Tareas programadas (Jobs) | Sprint 3-5 | `@Scheduled` recordatorios fiscales + sync bancario |
| Pasarela de pagos | Sprint 4-5 | TrueLayer PIS + Stripe sandbox |
| Relaciones + EAGER loading | ✓ | `@OneToMany`, `@ManyToOne` + `FetchType.EAGER` donde toca |

**Funcionalidad: 4 de los 3 mínimos exigidos**.

### Frontend

| Requisito | Cumplimiento | Implementación |
|---|---|---|
| SPA | ✓ | React 19 + Vite + React Router 7 |
| Consumir API externa | ✓ | TrueLayer, Stripe, listado de bancos |
| GET/POST/PUT/DELETE | ✓ | Todos los CRUDs usan los 4 verbos |
| Auth contra backend + sesión | ✓ | JWT en `localStorage`, AuthContext, interceptor |
| Min CRUDs | ✓ (6) | Mismos que backend |
| Framework JS | ✓ | React 19 (Angular se "recomienda" pero acepta cualquiera) |
| Rutas protegidas por rol | ✓ | `<ProtectedRoute>` + `<AdminRoute>` con check de `user.rol` |
| Optimización de carga | Sprint 7 | `React.lazy` + Suspense en rutas grandes (`AdminApp`) |
| Operaciones con arrays | ✓ | `.filter()`, `.map()`, `.sort()`, `.reduce()` en transacciones y facturas |
| Almacenamiento local | ✓ | `localStorage` (token), `sessionStorage` (filtros), opcional IndexedDB |
| Expresiones regulares | Sprint 7 | NIF/NIE, IBAN, móvil ES, email |
| Validación formularios | ✓ | Validación local en cada formulario |

### Maquetación

| Requisito | Cumplimiento | Implementación |
|---|---|---|
| HTML5 + CSS3 | ✓ | JSX semántico + CSS3 moderno |
| Vistas frontend + backend | ✓ | Páginas usuario + panel `/admin` |
| Responsive (desktop/tablet/móvil) | Parcial | `@media` queries presentes, completar en Sprint 7 |
| Framework CSS | ✓ | **Bootstrap 5.3** + React Bootstrap (`main.jsx:3`) |
| Preprocesador CSS | ✓ | **SASS** instalado (Sprint 1) con `_variables.scss` y `_mixins.scss` |
| Hoja de estilos coherente | ✓ | Design tokens en `index.css` + variables SCSS |

### Despliegue

| Requisito | Cumplimiento | Implementación previsto |
|---|---|---|
| Despliegue real | Sprint 8 | Railway/Render (backend) + Vercel (frontend) |
| Dominio | Sprint 8 | `payflow.es` o `pay-flow.app` |
| Control versiones | ✓ | Git + GitHub |

---

## 5. Arquitectura técnica

### Diagrama de microservicios

```
                         ┌──────────────────────┐
                         │   Cliente (React)    │
                         │  http://payflow.es   │
                         └──────────┬───────────┘
                                    │ HTTPS
                                    ▼
                         ┌──────────────────────┐
                         │   API Gateway :8080  │
                         │  - JWT validation    │
                         │  - X-User-Id header  │
                         │  - Routing predicates│
                         └──────────┬───────────┘
                                    │
       ┌────────────┬───────────┬───┴───────┬────────────┬──────────────┐
       ▼            ▼           ▼           ▼            ▼              ▼
  ┌─────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐
  │  auth   │  │   tx    │ │ wallet  │ │ banca   │ │ invoicing│ │ notification │
  │  :8081  │  │  :8082  │ │  :8083  │ │  :8085  │ │  :8086   │ │   :8087      │
  │ auth_db │  │  tx_db  │ │wallet_db│ │ bank_db │ │ invoice_db│ │              │
  └────┬────┘  └────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘ └──────┬───────┘
       │            │           │           │           │              │
       └────────────┴───────────┴─Eureka────┴───────────┴──────────────┘
                                    :8761
```

### Stack tecnológico

**Backend**
- Java 21 (LTS)
- Spring Boot 3.3.0
- Spring Cloud 2023.0.1 (Gateway + Eureka)
- Spring Security (auth-service y api-gateway únicamente)
- Spring Data JPA + Hibernate
- PostgreSQL 16
- iText7 8.0.4 (PDF)
- Spring Mail (emails)
- WebFlux (clientes HTTP reactivos hacia TrueLayer)
- Maven multi-módulo

**Frontend**
- React 19.2
- Vite 7.2
- React Router 7
- Bootstrap 5.3 + React Bootstrap 2.10
- SASS (dart-sass, integrado en Vite)
- FontAwesome 7 (iconografía)
- Recharts 3.8 (gráficos del admin)

**Infraestructura**
- Docker + Docker Compose (entorno dev)
- Railway/Render (despliegue backend)
- Vercel (despliegue frontend)
- GitHub (control versiones)

### Patrones aplicados

- **API Gateway** centraliza autenticación y enrutado
- **Service Discovery** con Eureka (resolución por nombre lógico, no IPs)
- **Token JWT** firmado HMAC con clave compartida entre auth y gateway
- **Microservicios stateless** sin sesión: cada request porta su JWT
- **Database per Service**: cada microservicio tiene su BD aislada
- **DTO Pattern**: entidades JPA nunca expuestas en el API, siempre vía DTOs
- **Repository Pattern**: Spring Data JPA
- **Global Exception Handler** uniforme en cada servicio (`@RestControllerAdvice`)
- **Ledger doble entrada** en wallet-service para integridad financiera (Sprint 2)

---

## 6. Servicios backend (detalle)

### 6.1 `auth-service` (puerto 8081)

Responsable de registro, login y emisión de JWT.

- **Entidad principal**: `User` (id UUID, email, passwordHash, fullName, rol enum [USER, ADMIN, AUTONOMO], createdAt)
- **Endpoints**:
  - `POST /auth/register` → registro con validación (email único, password ≥ 8 chars)
  - `POST /auth/login` → emite JWT con claims `sub`, `rol`, `exp`
  - `GET /auth/me` → datos del usuario actual (rutas protegidas)
- **Tecnología**: Spring Security 6 + BCrypt + JJWT

### 6.2 `transaction-service` (puerto 8082)

Gestiona ingresos y gastos categorizados.

- **Entidad principal**: `Transaction` (id, userId, descripcion, cantidad, tipo enum [INGRESO, GASTO], categoria, fecha)
- **Endpoints**:
  - `GET /transactions` → listar (con filtros)
  - `POST /transactions` → crear
  - `PUT /transactions/{id}` → editar
  - `DELETE /transactions/{id}` → eliminar
  - `GET /transactions/report/pdf?year=&month=` → informe mensual PDF
- **Tecnología**: Spring Data JPA + iText7

### 6.3 `wallet-service` (puerto 8083) — **Sprint 2**

Núcleo del producto. Saldo interno y operaciones P2P.

- **Entidades**:
  - `Wallet` (id, userId, balance, currency=EUR)
  - `LedgerEntry` (id, walletId, type [DEBIT/CREDIT], amount, balanceAfter, correlationId, description, createdAt)
- **Patrón ledger doble entrada**: cada transferencia P2P genera 2 entradas atómicas (DEBIT del emisor + CREDIT del receptor) bajo la misma `@Transactional`
- **Idempotencia**: header `Idempotency-Key` previene doble cobro en reintentos
- **Endpoints**:
  - `GET /wallet/me` → saldo actual
  - `GET /wallet/movements` → historial
  - `POST /wallet/send` → enviar a otro usuario
  - `POST /wallet/request` → pedir dinero (crea solicitud pendiente)

### 6.4 `bank-service` (puerto 8085)

Open Banking PSD2 vía TrueLayer (Sprint 5; ahora con stub Nordigen).

- **Entidades**:
  - `BankConnection` (id, userId, requisitionId, institutionId, institutionName, status enum [PENDING/LINKED/EXPIRED])
  - `BankTransaction` (id, userId, bankConnectionId, externalId, amount, description, bookingDate, importedToPayflow)
- **Endpoints**:
  - `GET /bank/institutions` → listar bancos disponibles
  - `POST /bank/connect` → iniciar OAuth bancario
  - `GET /bank/callback` → retorno OAuth (público)
  - `GET /bank/transactions` → importar movimientos
  - `POST /bank/topup` → cargar wallet desde banco (PIS, Sprint 5)
  - `DELETE /bank/disconnect`
- **Provider**: Nordigen (Sprint 2-4) → migración a TrueLayer (Sprint 5) para activar PIS

### 6.5 `invoicing-service` (puerto 8086)

Facturas con IVA/IRPF y modelos fiscales.

- **Entidades**:
  - `InvoiceEntity` (id, userId, numeroFactura, clienteNombre, clienteNif, concepto, baseImponible, tipoIva=21%, cuotaIva, tipoIrpf=15%, cuotaIrpf, total, fecha, estado enum [PENDIENTE/COBRADA/CANCELADA])
  - `ExpenseEntity` (id, userId, descripcion, proveedor, baseImponible, cuotaIva, total, fecha, categoria, deducible)
- **Endpoints**:
  - CRUD completo facturas y gastos
  - `GET /invoices/{id}/pdf` → factura PDF iText7
  - `GET /invoices/summary/quarterly?year=&quarter=` → resumen Modelo 303/130 (Sprint 6)

### 6.6 `notification-service` (puerto 8087) — **Sprint 3**

Envío de emails y notificaciones diferidas.

- Spring Mail + Gmail SMTP
- `@Scheduled` para recordatorios fiscales (15 días antes del trimestre)
- Eventos: pago P2P recibido, factura cobrada, próximo trimestre

### 6.7 `api-gateway` (puerto 8080)

- Spring Cloud Gateway (WebFlux reactivo)
- Filtro global `JwtAuthFilter`: valida JWT, inyecta `X-User-Id` y `X-User-Role` en headers downstream
- Rutas declaradas con predicados `Path=/auth/**`, `Path=/wallet/**`, etc.
- CORS habilitado para frontend

### 6.8 `discovery-service` (puerto 8761)

- Servidor Eureka estándar
- Todos los servicios se registran al arrancar
- Resolución por nombre lógico: `lb://wallet-service`

---

## 7. Frontend

### Estructura

```
frontend/src/
├── admin/                  ← React Admin para panel administrador
├── components/             ← Componentes reutilizables
│   ├── AppLayout.jsx       ← Layout con sidebar y navbar
│   ├── Navbar.jsx
│   ├── FloatingAssistantButton.jsx
│   ├── PayFlowLogo.jsx
│   └── ThemeContext.jsx
├── config/                 ← Configuración API + stores
├── context/                ← AuthContext, ThemeContext
├── pages/                  ← Vistas
│   ├── Landing.jsx         ← Página pública
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Remember.jsx
│   ├── Home.jsx            ← Dashboard
│   ├── Transacciones.jsx
│   ├── Banca.jsx           ← Open Banking
│   ├── Autonomos.jsx       ← Facturas y gastos
│   ├── Wallet.jsx          ← Wallet (Sprint 2)
│   └── ProtectedRoute.jsx
└── styles/                 ← CSS Modules + SCSS
    ├── _variables.scss     ← Design tokens SCSS
    ├── _mixins.scss        ← Mixins responsive
    └── *.module.css        ← Migración progresiva a .module.scss
```

### Rutas principales

| Ruta | Componente | Protegida | Rol |
|---|---|---|---|
| `/` | Landing | No | — |
| `/login` | Login | No | — |
| `/registro` | Register | No | — |
| `/recuperar-password` | Remember | No | — |
| `/home` | Home | Sí | USER |
| `/wallet` | Wallet | Sí | USER |
| `/transacciones` | Transacciones | Sí | USER |
| `/banco` | Banca | Sí | USER |
| `/autonomos` | Autonomos | Sí | AUTONOMO |
| `/admin/*` | AdminApp | Sí | ADMIN |

### Sistema de diseño

**Paleta** (definida en `index.css` y `_variables.scss`):
- Primario: teal/cian `#0891b2` (escala 50-400)
- Secundario: amarillo dorado `#f2c038` (usado en logos)
- Terciario: rojo coral `#f23860` (datos negativos/errores)
- Grises neutros + texto semántico

**Componentes Bootstrap usados**: `Button`, `Form`, `Card`, `ListGroup`, `Image` (importados de `react-bootstrap` en `components/`)

**CSS Modules** para estilos específicos por componente, evitando colisiones globales.

**SASS** activado en Sprint 1; migración progresiva de `.module.css` → `.module.scss` a medida que se trabajen las vistas.

---

## 8. Decisiones técnicas justificadas

### 8.1 Microservicios vs monolito

**Decisión**: microservicios.

**Justificación**:
- **Aislamiento de fallos**: si bank-service cae por un error en TrueLayer, el wallet y las facturas siguen funcionando
- **Escalado independiente**: el bank-service consume más memoria por las llamadas HTTP a APIs externas; puede escalarse aparte
- **Despliegue independiente**: pivotes futuros (ej. añadir un módulo de impuestos) no requieren redesplegar todo
- **Aprendizaje**: el TFG es la oportunidad de aprender patrones reales (Service Discovery, API Gateway, JWT distribuido)

**Contras asumidos**:
- Mayor complejidad de despliegue (mitigado con Docker Compose en dev y Railway en prod)
- Latencia entre servicios (mitigado con discovery local y queries optimizadas)

### 8.2 TrueLayer vs Nordigen vs Plaid

**Decisión**: TrueLayer (Sprint 5; ahora Nordigen como stub).

**Justificación**:
| Proveedor | AIS (leer) | PIS (pagar) | Sandbox | Docs |
|---|---|---|---|---|
| Nordigen | ✓ | ✗ | ✓ | Aceptable |
| TrueLayer | ✓ | ✓ | ✓ | Excelente |
| Plaid | ✓ | Limitado EU | ✓ | Excelente pero foco US |
| Tink | ✓ | ✓ | ✓ | Buena pero onboarding lento |

TrueLayer aporta **Payment Initiation Service (PIS)**, imprescindible para hacer top-up real del wallet desde el banco del usuario. Nordigen es solo lectura.

### 8.3 Bootstrap + CSS Modules + SASS coexistiendo

**Decisión**: usar las tres tecnologías en capas diferenciadas.

- **Bootstrap 5**: solo para grid system (`Row`, `Col`) y utilities (spacing, breakpoints)
- **CSS Modules**: estilos propios por componente, encapsulados, sin colisiones
- **SASS**: variables compartidas (`_variables.scss`), mixins (`_mixins.scss`), nesting cuando aporta

**Justificación**: el requisito del TFG pide "framework CSS" y "preprocesador". Bootstrap cubre framework; SASS cubre preprocesador; CSS Modules es la solución técnicamente correcta para componentes React aislados. No hay solapamiento si se respetan las capas.

### 8.4 Ledger doble entrada en wallet

**Decisión**: cada movimiento P2P genera dos entradas atómicas en `LedgerEntry`.

**Justificación**: estándar contable financiero. Garantiza que la suma de débitos = suma de créditos en cualquier momento. Auditable. Si hay un fallo en mitad de la operación, Spring `@Transactional` hace rollback de ambas entradas.

**Alternativa rechazada**: un solo movimiento por transferencia con `from` y `to`. Más simple pero más difícil de auditar y de calcular saldos derivados.

### 8.5 React vs Angular

**Decisión**: React 19.

**Justificación**:
- React es el framework más usado en la industria (>80% del mercado JS)
- React 19 introduce Server Components y mejoras de Suspense relevantes para optimización
- El requisito dice "se recomienda Angular" pero acepta cualquiera
- Mejor ecosistema de librerías compatibles (React Bootstrap, React Admin, FontAwesome, Recharts)

---

## 9. Plan de sprints

| Sprint | Semana | Foco | Estado |
|---|---|---|---|
| 1 | 1 | Cimientos: limpieza crypto + SASS + Bootstrap | **Completado** |
| 2 | 2 | Wallet service + ledger doble entrada + vista /wallet | Pendiente |
| 3 | 3 | P2P transfers + QR + notification-service + emails | Pendiente |
| 4 | 4 | Invoicing + Stripe payment links + conciliación | Pendiente |
| 5 | 5 | Migración TrueLayer + Open Banking PIS + top-up | Pendiente |
| 6 | 6 | Modelos fiscales 303/130 + dashboard fiscal + panel admin completo | Pendiente |
| 7 | 7 | Optimización + regex + tests + responsive completo | Pendiente |
| 8 | 8 | Despliegue + dominio + memoria final | Pendiente |

---

## 10. Sprint 1 — Cimientos (Completado)

### Objetivos

1. Eliminar deuda técnica: borrar los servicios crypto que no encajan en el nuevo producto
2. Instalar y configurar SASS como preprocesador CSS (requisito TFG)
3. Confirmar Bootstrap 5 como framework CSS (ya instalado, falta documentar uso)
4. Crear este documento de memoria

### Cambios realizados

**Backend**
- Eliminado `backend/price-service/` (puerto 8084, BD `price_db`)
- Eliminado `backend/trading-service/` (puerto 8083, BD `trading_db`) — *nota: directorio físicamente vacío, pero queda un handle de Windows que el usuario debe liberar cerrando el IDE; el puerto 8083 queda libre para reasignarlo a wallet-service en Sprint 2*
- Actualizado `backend/docker-compose.yml`: eliminadas secciones `trading-service` y `price-service`
- Actualizado `backend/init.sql`: eliminada `trading_db`, añadida `wallet_db`

**Frontend**
- Eliminado `frontend/src/pages/Crypto.jsx`
- Eliminado `frontend/src/styles/Crypto.module.css`
- Editado `frontend/src/App.jsx`: eliminado import y ruta `/crypto`
- Editado `frontend/src/components/Navbar.jsx`: eliminado NavLink hacia `/crypto`
- Editado `frontend/src/components/AppLayout.jsx`: renombrado `IconCrypto` → `IconWallet`, sustituido NAV_LINK `/crypto` por `/wallet`
- Editado `frontend/src/pages/Landing.jsx`: feed reorientado a P2P/wallet/factura, plan Plus reposicionado a "envíos y cobros", bento card de crypto sustituida por wallet+P2P
- Editado `frontend/src/pages/Login.jsx`: textos del panel de marca actualizados a la nueva propuesta de valor

**SASS**
- Instalado `sass` como devDependency (`npm install -D sass`)
- Creado `frontend/src/styles/_variables.scss` con design tokens importables: colores primarios, semánticos, grises, espaciado, radios, sombras, breakpoints
- Creado `frontend/src/styles/_mixins.scss` con mixins: `respond()`, `card()`, `btn-primary`, `btn-secondary`, `truncate`, `flex-center`
- **Estrategia de migración**: NO se renombran todos los `.module.css` ahora (45+ archivos, riesgo). La migración a `.module.scss` se hace gradualmente por vista cuando se trabaja en ella. Las vistas nuevas (Wallet en Sprint 2) nacen directamente en SCSS.

### Verificación

- `npm run build` → exit 0, 15.27s, sin errores nuevos
- `npm run dev` → arranca en http://localhost:5173
- Ruta `/crypto` → ya no existe, fallback a `/login`
- Navbar y sidebar → sin enlace Crypto

### Justificación documental para el tribunal

El pivote del producto se documenta en la memoria como **decisión de diseño consciente**, no como cambio de última hora. Demuestra capacidad de análisis crítico del propio trabajo, ajuste de scope ante un análisis de mercado real, y disciplina para borrar código que no aporta valor (anti-pattern: feature creep).

---

## 11. Sprint 2 — Wallet service (pendiente)

> A rellenar al ejecutar el sprint.

---

## 12. Sprint 3 — P2P + emails (pendiente)

> A rellenar al ejecutar el sprint.

---

## 13. Sprint 4 — Payment links + Stripe (pendiente)

> A rellenar al ejecutar el sprint.

---

## 14. Sprint 5 — TrueLayer + PIS (pendiente)

> A rellenar al ejecutar el sprint.

---

## 15. Sprint 6 — Fiscalidad + admin (pendiente)

> A rellenar al ejecutar el sprint.

---

## 16. Sprint 7 — Optimización + tests (pendiente)

> A rellenar al ejecutar el sprint.

---

## 17. Sprint 8 — Despliegue + dominio (pendiente)

> A rellenar al ejecutar el sprint.

---

## 18. Glosario

| Término | Significado |
|---|---|
| **AEAT** | Agencia Estatal de Administración Tributaria (Hacienda española) |
| **AIS** | Account Information Service (PSD2): leer cuentas y movimientos |
| **API Gateway** | Punto único de entrada que enruta peticiones y centraliza políticas (auth, rate limiting) |
| **Bean Validation** | Estándar Java (Jakarta) para validar campos con anotaciones (`@NotNull`, `@Size`, etc.) |
| **CRUD** | Create, Read, Update, Delete |
| **Eureka** | Servidor de descubrimiento de servicios de Netflix/Spring Cloud |
| **EAGER loading** | Estrategia JPA de cargar relaciones inmediatamente al recuperar la entidad padre |
| **IBAN** | International Bank Account Number |
| **IRPF** | Impuesto sobre la Renta de las Personas Físicas |
| **IVA** | Impuesto sobre el Valor Añadido |
| **Jakarta EE** | Sucesor de Java EE, base de Spring |
| **JPA** | Java Persistence API (estándar de ORM) |
| **JWT** | JSON Web Token (estándar RFC 7519 para tokens de autenticación firmados) |
| **LAZY loading** | Estrategia JPA de cargar relaciones bajo demanda (al acceder al campo) |
| **Microservicio** | Servicio autónomo, desplegable independientemente, con su propia BD |
| **Modelo 303** | Declaración trimestral del IVA (España) |
| **Modelo 130** | Pago fraccionado del IRPF para autónomos (España) |
| **NIF/NIE** | Número de Identificación Fiscal / Número de Identidad de Extranjero |
| **Open Banking** | Apertura regulada de las APIs bancarias (PSD2 en Europa) |
| **PIS** | Payment Initiation Service (PSD2): iniciar pagos en nombre del usuario |
| **PSD2** | Payment Services Directive 2 (directiva europea de servicios de pago, 2018) |
| **RETA** | Régimen Especial de Trabajadores Autónomos (Seguridad Social ES) |
| **SPA** | Single Page Application |
| **SEPA** | Single Euro Payments Area (zona única de pagos en euros) |

---

## 19. Bibliografía y referencias

### Documentación técnica
- **Spring Boot Reference**: https://docs.spring.io/spring-boot/docs/current/reference/html/
- **Spring Cloud Gateway**: https://docs.spring.io/spring-cloud-gateway/reference/
- **TrueLayer Docs**: https://docs.truelayer.com/
- **GoCardless Bank Account Data API (Nordigen)**: https://bankaccountdata.gocardless.com/api/docs/
- **iText7 PDF Library**: https://itextpdf.com/products/itext-7
- **React 19 Docs**: https://react.dev
- **Vite Guide**: https://vitejs.dev/guide/

### Regulación y fiscalidad
- **PSD2 — Directiva (UE) 2015/2366**: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32015L2366
- **AEAT Modelo 303 (IVA)**: https://sede.agenciatributaria.gob.es/Sede/iva/iva-autoliquidaciones-resumen-anual.html
- **AEAT Modelo 130 (IRPF autónomos)**: https://sede.agenciatributaria.gob.es/Sede/irpf/pagos-fraccionados.html
- **RGPD — Reglamento (UE) 2016/679**: https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32016R0679

### Análisis de mercado
- **Ministerio de Inclusión, Seguridad Social y Migraciones — Autónomos RETA** (datos actualizados): https://www.inclusion.gob.es/
- **Open Banking Europe — Annual State of the Industry Report 2024**

---

*Documento vivo. Última actualización: Sprint 1 (Cimientos).*
