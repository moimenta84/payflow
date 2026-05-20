# API Gateway

Punto de entrada único de PayFlow. Todos los microservicios son inaccesibles desde el exterior — el frontend solo habla con este servicio.

**Puerto:** `8080`

---

## Responsabilidades

1. **Enrutamiento** — redirige cada path al microservicio correspondiente vía Eureka (load balancing)
2. **Autenticación JWT** — valida el token Bearer antes de dejar pasar la petición
3. **Propagación de identidad** — inyecta `X-User-Id` y `X-User-Email` en la cabecera para que los servicios internos no necesiten revalidar el JWT
4. **CORS** — permite peticiones desde el frontend (`localhost:5173`)

---

## Rutas

| Ruta | Servicio destino | JWT requerido |
|------|-----------------|---------------|
| `POST /auth/login` | auth-service | No |
| `POST /auth/register` | auth-service | No |
| `POST /auth/reset-password` | auth-service | No |
| `GET /auth/me` | auth-service | Sí |
| `/transactions/**` | transaction-service | Sí |
| `/orders/**` | trading-service | Sí |
| `/portfolio/**` | trading-service | Sí |
| `/assets/**` | trading-service | No |
| `/prices/**` | price-service | No |

---

## Flujo de una petición autenticada

```
Frontend (5173)
    │
    │  POST /transactions  { Authorization: Bearer <jwt> }
    ▼
API Gateway (8080)
    │
    ├─ JwtAuthFilter
    │     ├─ Extrae token del header Authorization
    │     ├─ Verifica firma HMAC-SHA con el secret compartido
    │     ├─ Extrae sub (userId) y email del payload
    │     └─ Inyecta X-User-Id y X-User-Email en la request
    │
    └─ Redirige a transaction-service (8082) vía Eureka
```

---

## Flujo de una petición pública

```
Frontend (5173)
    │
    │  POST /auth/register  { nombre, email, password, ... }
    ▼
API Gateway (8080)
    │
    └─ Sin filtro JWT → redirige directamente a auth-service (8081)
```

---

## JwtAuthFilter

`filter/JwtAuthFilter.java`

- Comprueba que el header `Authorization` empiece por `Bearer `
- Si falta o es inválido → devuelve `401 Unauthorized` sin llegar al microservicio
- Si es válido → muta la request añadiendo:
  - `X-User-Id`: el `sub` del JWT (UUID del usuario)
  - `X-User-Email`: el claim `email` del JWT
- El secret se configura con `app.jwt.secret` (mismo valor que en auth-service)

---

## CORS

Configurado globalmente para el frontend local:

```yaml
globalcors:
  cors-configurations:
    '[/**]':
      allowedOrigins: "http://localhost:5173"
      allowedMethods: "*"
      allowedHeaders: "*"
      allowCredentials: true
```

En producción cambiar `allowedOrigins` por el dominio real del frontend.

---

## Configuración clave

```yaml
app:
  jwt:
    secret: payflow-super-secret-key-2024-tfg  # mismo secret que auth-service

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
```

El gateway descubre los microservicios por nombre (`lb://auth-service`, `lb://transaction-service`…) a través de Eureka — no hay IPs hardcodeadas.
