# PayFlow — Análisis del Proyecto

**Fecha:** 2026-05-20  
**Repositorio:** https://github.com/moimenta84/payflow

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

### Pendiente ❌ — necesario para el TFG
- `@Valid` + anotaciones de validación en todos los DTOs
- Panel de administración (`/admin/**`, rol ADMIN)
- Generación de PDF (informe mensual de transacciones)
- Envío de emails (bienvenida al registrarse, alertas de precio)
- Pasarela de pagos (Stripe)
- Migración de CSS Modules a SASS
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
