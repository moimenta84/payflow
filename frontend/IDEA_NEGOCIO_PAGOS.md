# PayFlow — Plataforma de Gestión de Pagos y Wallets

## Idea de Negocio

**com** es una plataforma SaaS B2B que permite a pequeñas y medianas empresas
integrar capacidades de pago en sus productos sin lidiar con la complejidad de las
pasarelas de cobro directamente.

Casos de uso reales:
- Marketplace que necesita dividir pagos entre vendedor y plataforma
- App de servicios que cobra al cliente y paga al proveedor con comisión
- Plataforma de suscripciones con billing recurrente
- Sistema de wallet interno para apps de fidelización o créditos

El sistema no mueve dinero real directamente — delega en **Stripe** o **MercadoPago**
como motor de cobros, y gestiona la lógica de negocio por encima (wallets, splits,
comisiones, historial, notificaciones).

---

## Arquitectura de Microservicios

```
┌─────────────────────────────────────────────────────────┐
│              Frontend — Vite + React + TypeScript        │
│         (Dashboard, wallet, pagos, historial)            │
└─────────────────────────┬───────────────────────────────┘
                           │ HTTP / REST
┌─────────────────────────▼───────────────────────────────┐
│                        API Gateway                       │
│              (autenticación, rate limiting)              │
└────────┬──────────┬──────────┬──────────┬───────────────┘
         │          │          │          │
    ┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌───▼──────┐
    │ users  │ │wallet  │ │payment │ │notif.    │
    │service │ │service │ │service │ │service   │
    └────────┘ └────────┘ └───┬────┘ └──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Stripe / MercadoPago│
                    │     (pasarela real)  │
                    └─────────────────────┘
```

### Microservicios

| Servicio | Responsabilidad | Puerto |
|---|---|---|
| `api-gateway` | Enrutamiento, JWT validation, rate limit | 8080 |
| `users-service` | Registro, login, perfiles, KYC básico | 8081 |
| `wallet-service` | Balance virtual, créditos, historial | 8082 |
| `payment-service` | Integración Stripe/MercadoPago, webhooks | 8083 |
| `notification-service` | Emails y push por cada movimiento | 8084 |
| `config-server` | Configuración centralizada | 8888 |
| `discovery-server` | Eureka — registro de servicios | 8761 |

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Vite + React + TypeScript |
| UI Components | shadcn/ui + Tailwind CSS |
| Estado global | Zustand |
| HTTP client | Axios + React Query |
| Backend | Java 17 + Spring Boot 3 + Spring Cloud |
| Base de datos | PostgreSQL (una por servicio) |
| Mensajería | RabbitMQ (eventos entre servicios) |
| Autenticación | JWT + Spring Security |
| Pasarela de pago | Stripe API (o MercadoPago para LATAM) |
| Documentación | Springdoc OpenAPI (Swagger UI) |
| Observabilidad | Micrometer + Zipkin + Grafana |
| Infraestructura | Docker Compose (local) / Railway o Render (cloud) |

---

## Fases de Desarrollo

### Fase 1 — Base (2-3 semanas)
- [ ] Scaffolding del proyecto con Spring Initializr
- [ ] Config Server + Discovery Server (Eureka)
- [ ] API Gateway con validación JWT
- [ ] `users-service`: registro, login, JWT
- [ ] Base de datos PostgreSQL por servicio con Docker Compose

### Fase 2 — Core de Pagos (3-4 semanas)
- [ ] `wallet-service`: crear wallet, consultar balance, registrar movimientos
- [ ] `payment-service`: integración con Stripe (checkout, webhooks)
- [ ] Transacciones distribuidas con patrón SAGA
- [ ] Transferencias entre wallets (debitar origen, acreditar destino)

### Fase 3 — Notificaciones y Observabilidad (1-2 semanas)
- [ ] `notification-service`: emails con Spring Mail (o SendGrid)
- [ ] Eventos con RabbitMQ entre payment → notification
- [ ] Tracing distribuido con Zipkin
- [ ] Dashboard Grafana con métricas de transacciones

### Fase 4 — Frontend React (2-3 semanas)
- [ ] Setup Vite + React + TypeScript + Tailwind CSS
- [ ] Pantallas: Login, Registro, Dashboard, Wallet, Historial, Transferir
- [ ] Integración con Stripe Elements (formulario de pago)
- [ ] Manejo de JWT en cliente (Axios interceptors)
- [ ] Estado global con Zustand (usuario, balance)

### Fase 5 — Despliegue y Portfolio (1 semana)
- [ ] Docker Compose completo (backend + frontend + DBs)
- [ ] Despliegue en Railway o Render (gratuito)
- [ ] Swagger UI con todos los endpoints documentados
- [ ] README con arquitectura, capturas y demo en vivo

---

## Endpoints Principales (API Pública)

```
POST   /api/auth/register          — Registro de usuario
POST   /api/auth/login             — Login, devuelve JWT

GET    /api/wallet/balance         — Consultar saldo
GET    /api/wallet/transactions    — Historial de movimientos
POST   /api/wallet/transfer        — Transferir a otro usuario

POST   /api/payments/checkout      — Iniciar pago con Stripe
POST   /api/payments/webhook       — Webhook de Stripe (confirmar pago)
GET    /api/payments/{id}          — Estado de un pago
```

---

## Propuesta de Valor para Clientes Freelance

**¿A quién venderías esto?**
- Startups que están construyendo un marketplace
- Apps de servicios (delivery, tutores, freelancers) que necesitan cobros y pagos
- Plataformas de e-learning con suscripciones

**¿Por qué pagarían?**
- Integrar Stripe bien tarda semanas; tú lo entregas funcionando
- La lógica de wallets y splits es compleja y propensa a errores
- Prefieren pagar por algo ya hecho y testeado

**Precio de referencia en plataformas freelance:**
- Upwork / Freelancer: USD 800–2500 por el MVP completo
- Como producto SaaS propio: USD 49–199/mes por empresa

---

## Diferenciadores Técnicos (para el Portfolio)

1. **Patrón SAGA** para consistencia en transacciones distribuidas
2. **Idempotencia** en pagos (no cobrar dos veces por el mismo intent)
3. **Webhooks** de Stripe procesados de forma asíncrona con RabbitMQ
4. **Multi-currency** preparado desde el diseño
5. **Audit log** inmutable de cada movimiento financiero

---

## Recursos Útiles

- Stripe Docs: https://stripe.com/docs/api
- MercadoPago Docs: https://www.mercadopago.com.ar/developers
- Patrón SAGA: https://microservices.io/patterns/data/saga.html
- Railway (despliegue gratuito): https://railway.app
