# PayFlow — Backend Microservicios

**Stack:** Spring Boot 3.3 · Spring Cloud · ActiveMQ Artemis · PostgreSQL

---

## Estado actual — 2026-05-20

| Servicio | Puerto | Estado | BD |
|---|---|---|---|
| discovery-service | 8761 | ✅ Operativo | — |
| api-gateway | 8080 | ✅ Operativo | — |
| auth-service | 8081 | ✅ Operativo | auth_db |
| transaction-service | 8082 | ✅ Operativo | transactions_db |
| trading-service | 8083 | ✅ Operativo | trading_db |
| price-service | 8084 | ✅ Operativo | — |

---

## Mensajería — ActiveMQ Artemis embebido

IBM MQ fue reemplazado por ActiveMQ Artemis en modo embebido. No requiere infraestructura externa — el broker arranca dentro de cada servicio que lo necesite.

**Configuración en application.properties:**
```properties
spring.artemis.mode=embedded
spring.artemis.embedded.enabled=true
management.health.jms.enabled=false
```

### Colas activas

| Cola | Produce | Consume | Propósito |
|---|---|---|---|
| `TRANSACTION.CREATED` | transaction-service | trading-service | Notificar nueva transacción |
| `PRICE.UPDATED` | price-service | trading-service | Actualizar precios en portfolio |

---

## Estructura de carpetas

```
backend/
├── discovery-service/    → Eureka Server
├── api-gateway/          → Gateway + JWT filter + CORS
├── auth-service/         → Usuarios, auth, roles
├── transaction-service/  → CRUD transacciones
├── trading-service/      → Órdenes crypto + portfolio
└── price-service/        → Precios CoinGecko en tiempo real
```

---

## Configuración común a todos los servicios

Cada servicio tiene su `application.properties` con:
```properties
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:payflow123}
eureka.client.service-url.defaultZone=${EUREKA_URI:http://localhost:8761/eureka}
management.endpoints.web.exposure.include=health
```

---

## Cómo crear las bases de datos (primera vez)

```bash
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE auth_db"
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE transactions_db"
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE trading_db"
```

Hibernate crea las tablas automáticamente con `spring.jpa.hibernate.ddl-auto=update`.

---

## Decisiones de diseño

| Decisión | Motivo |
|---|---|
| Sin Lombok | Lógica explícita — más claro para el TFG |
| Artemis embebido | IBM MQ no disponible en Maven Central |
| Database-per-Service | Microservicios independientes — sin acoplamiento de datos |
| Gateway valida JWT | Un solo punto de autenticación — los servicios confían en el gateway |
| Sin Docker | Entorno Windows local sin Docker disponible |
| `trust` en pg_hba.conf | Desarrollo local — sin gestión de contraseñas PostgreSQL |

---

## Próximos pasos (requisitos TFG pendientes)

- [ ] `@Valid` + `@NotBlank` en todos los DTOs
- [ ] Endpoints `/admin/**` (rol ADMIN)
- [ ] PDF generation con iText (informe mensual)
- [ ] Spring Mail (email de bienvenida + alertas)
- [ ] Stripe payment gateway
- [ ] Dockerizar todos los servicios
- [ ] Despliegue con dominio real
