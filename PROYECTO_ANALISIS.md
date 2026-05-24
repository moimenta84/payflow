# PayFlow — Análisis del Proyecto

**Última actualización:** 2026-05-24  
**Repositorio:** https://github.com/moimenta84/PayFlow

---

## Descripción

PayFlow es una aplicación web de **gestión financiera personal + trading de criptomonedas**. Permite al usuario registrar sus ingresos y gastos, y operar con activos crypto (Bitcoin, Ethereum, Solana, Ripple) viendo precios en tiempo real desde CoinGecko.

---

## Stack

### Backend — Microservicios
| Tecnología | Versión | Uso |
|---|---|---|
| Java | 21 | Lenguaje |
| Spring Boot | 3.3.0 | Framework base |
| Spring Cloud Netflix Eureka | 2023.0.1 | Service discovery |
| Spring Cloud Gateway | 2023.0.1 | API Gateway + JWT filter |
| Spring Data JPA + Hibernate | 6.5 | ORM |
| PostgreSQL | 17 | Base de datos |
| ActiveMQ Artemis (embedded) | auto | Mensajería JMS |
| JJWT | 0.12.5 | JWT |
| BCrypt | — | Hash de contraseñas |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.2.0 | UI framework |
| Vite | 7.2.4 | Build tool |
| React Router DOM | 7.12.0 | SPA routing |
| Bootstrap + MUI + Tailwind | 5/7/4 | CSS frameworks |
| Font Awesome | 7.1.0 | Iconos |
| CSS Modules | — | Estilos por componente |

---

## Arquitectura

```
Browser (localhost:5173)
        │
        ▼
 API Gateway :8080
   ├─ CORS para localhost:5173
   ├─ JwtAuthFilter (rutas protegidas)
   └─ Load balancing vía Eureka
        │
        ├──────────────────────────────────────────────────┐
        ▼                 ▼                 ▼              ▼
auth-service :8081  transaction :8082  trading :8083  price :8084
   PostgreSQL           PostgreSQL      PostgreSQL    CoinGecko API
   auth_db              transactions_db  trading_db    (externo)
        │                    │               │              │
        └────────────────────┴───────────────┴──────────────┘
                          Artemis JMS (embedded)
                     TRANSACTION.CREATED | PRICE.UPDATED
```

### Eureka (Service Discovery) — :8761
Todos los microservicios se registran aquí. El gateway los descubre por nombre (`lb://auth-service`) sin IPs hardcodeadas.

---

## Microservicios

| Servicio | Puerto | BD | Responsabilidad |
|---|---|---|---|
| discovery-service | 8761 | — | Registro Eureka |
| api-gateway | 8080 | — | Routing + JWT + CORS |
| auth-service | 8081 | auth_db | Registro, login, JWT, roles |
| transaction-service | 8082 | transactions_db | CRUD ingresos/gastos |
| trading-service | 8083 | trading_db | Órdenes crypto + portfolio |
| price-service | 8084 | — | Precios CoinGecko en tiempo real |

---

## Autenticación y Roles

- **JWT** firmado con HMAC-SHA256, expira en 24h
- **Roles:** `USER` (por defecto al registrarse) y `ADMIN` (asignable solo desde admin)
- El **gateway** valida el JWT e inyecta `X-User-Id` y `X-User-Email` en los headers internos
- Los microservicios nunca validan el JWT directamente — confían en el gateway

---

## Estado de implementación

### Completado ✅
- Todos los microservicios arrancan y están registrados en Eureka
- Autenticación JWT completa (register, login, me)
- CORS configurado (gateway → frontend)
- CRUD completo de transacciones (GET, POST, PUT, DELETE)
- CRUD órdenes de trading (COMPRA/VENTA con validación de portfolio)
- Portfolio del usuario con valor en tiempo real
- Precios crypto desde CoinGecko actualizados cada 30s
- Mensajería asíncrona con Artemis embebido
- Frontend migrado de Firebase a REST API
- Nombre de usuario correcto desde `fullName` del backend

### Completado en sesión 2026-05-24 ✅
- Rediseño Landing page: dark teal fintech (`#050e12`) con paleta cian
- Actualización global de tokens de color: verde → teal en `index.css`
- Corrección bug dark mode CSS Modules (`:global(.dark)`)
- Inputs `CajaTexto` con bordes redondeados y color teal
- Gradientes de paneles Login/Register actualizados a teal
- Código fuente copiado a directorio IntelliJ (`C:\2_Daw\TFG`)

### Pendiente ❌ — necesario para el TFG
- ~~`@Valid` + anotaciones de validación en todos los DTOs~~ ✅ Completado
- ~~Panel de administración (`/admin/**`, rol ADMIN)~~ ✅ Integrado en React (ruta `/admin/*`)
- ~~Generación de PDF (informe mensual de transacciones)~~ ✅ Endpoint + botón en frontend
- ~~Envío de emails (bienvenida al registrarse, alertas de precio)~~ ✅ Spring Mail implementado
- ~~UI de Trading (comprar/vender crypto)~~ ✅ Tab Trading en página Crypto
- Pasarela de pagos (Stripe)
- Diseño responsive (tablet + mobile)
- Despliegue con dominio real

### Mejoras de alto impacto planificadas
- Gráficas en tiempo real (evolución de portfolio y precios)
- Alertas de precio configurables por el usuario
- Resumen financiero inteligente (cruce transacciones + portfolio)
- Integración Open Banking (Plaid sandbox)

---

## Cómo arrancar en local

### Requisitos
- Java 21, Maven 3.9
- PostgreSQL 17 corriendo en localhost:5432
- Bases de datos creadas: `auth_db`, `transactions_db`, `trading_db`

### Orden de arranque
```bash
# 1. Eureka (esperar a que esté en http://localhost:8761)
cd backend/discovery-service && mvn spring-boot:run

# 2. Auth service
cd backend/auth-service && mvn spring-boot:run

# 3. Transaction service
cd backend/transaction-service && mvn spring-boot:run

# 4. Trading service
cd backend/trading-service && mvn spring-boot:run

# 5. Price service
cd backend/price-service && mvn spring-boot:run

# 6. API Gateway
cd backend/api-gateway && mvn spring-boot:run

# 7. Frontend
cd frontend && npm run dev
```

### URLs
| URL | Qué es |
|---|---|
| http://localhost:5173 | Frontend |
| http://localhost:8080 | API Gateway (entrada única) |
| http://localhost:8761 | Panel Eureka |

---

## Sistema de diseño — UI

### Paleta de color (actualizada 2026-05-24)

La app usa una paleta **teal/cian** como color primario, reemplazando el verde original.

| Token CSS | Valor | Uso |
|---|---|---|
| `--color-primary-50` | `#a5f3fc` | Texto claro sobre fondos oscuros |
| `--color-primary-100` | `#22d3ee` | Acento brillante, live indicators |
| `--color-primary-150` | `#06b6d4` | Acento medio |
| `--color-primary-200` | `#0891b2` | Botones principales, bordes activos |
| `--color-primary-250` | `#0e7490` | Hover de botones |
| `--color-primary-300` | `#155e75` | Color primario base |
| `--color-primary-350` | `#164e63` | Variante oscura |
| `--color-primary-400` | `#0c3549` | Color más oscuro |

### Landing page (dark fintech)

| Propiedad | Valor |
|---|---|
| Fondo principal | `#050e12` (negro con tinte teal) |
| Secciones alternas | `#040b0f` |
| Acento brillante | `#22d3ee` |
| Botones CTA | `#0891b2` (hover `#0e7490`) |
| Glow orbs | `rgba(6,182,212,0.11-0.13)` blur 90-110px |
| Panel marca Login/Register | `linear-gradient(145deg, #0c3549, #155e75, #0891b2)` |

### Arquitectura CSS

- **CSS Modules** para todos los componentes (`*.module.css`)
- **Dark mode** mediante clase `.dark` en `<html>` (ThemeContext)
- **Bug crítico resuelto:** en CSS Modules `.dark .clase` no funciona — se compila con hash. Correcto: `:global(.dark) .clase`
- **Design tokens** en `index.css` bajo `:root` — todos los componentes usan `var(--color-primary-*)`
- **Inputs CajaTexto** (Bootstrap `Form.Control`): estilizados via `.CajaTexto .form-control` en `index.css` con `border-radius: 10px` y `border: 1.5px solid #0891b2`

### Páginas y rutas frontend

| Ruta | Componente | Acceso |
|---|---|---|
| `/` | `Landing.jsx` | Público — marketing page dark teal |
| `/login` | `Login.jsx` | Público |
| `/registro` | `Register.jsx` | Público |
| `/recuperar-password` | `Remember.jsx` | Público |
| `/home` | `Home.jsx` | Protegido — dashboard |
| `/transacciones` | `Transacciones.jsx` | Protegido |
| `/transation` | `Transation.jsx` | Protegido — nueva transacción |
| `/crypto` | `Crypto.jsx` | Protegido — trading + precios |
| `/admin/*` | `AdminApp.jsx` | Solo ADMIN (React Admin) |

---

## Decisiones de diseño clave

| Decisión | Motivo |
|---|---|
| Sin Lombok | Código explícito — mejor para entender la lógica en el TFG |
| Artemis embebido (no IBM MQ) | IBM MQ no está en Maven Central — Artemis es compatible JMS y no requiere infraestructura externa |
| Sin Docker | Entorno de desarrollo Windows sin Docker disponible — servicios corren directamente con Maven |
| pg_hba.conf en `trust` | Desarrollo local — sin necesidad de gestión de contraseñas PostgreSQL |
| Gateway valida JWT | Un solo punto de validación — los microservicios no duplican la lógica |
| Database-per-Service | Patrón microservicios — cada servicio es completamente independiente |
| `fullName` en UserResponse | Combina nombre + apellido en el backend — el frontend solo necesita un campo |
