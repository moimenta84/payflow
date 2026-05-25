# API Gateway

Punto de entrada único para todas las peticiones del frontend hacia los microservicios del backend.

## Responsabilidad

- **Enrutamiento dinámico**: redirige cada ruta al microservicio correspondiente usando el nombre registrado en Eureka (balanceo de carga automático con `lb://`).
- **Validación JWT**: el filtro `JwtAuthFilter` verifica el token Bearer en cada ruta protegida, extrae el `userId`, `email` y `rol`, y los propaga como cabeceras HTTP internas (`X-User-Id`, `X-User-Email`, `X-User-Rol`). Los microservicios aguas abajo nunca tocan el JWT directamente.
- **Control de acceso admin**: el filtro `AdminRoleFilter` bloquea las rutas `/admin/**` si el usuario no tiene rol `ADMIN`.
- **CORS**: permite peticiones desde el frontend React (`http://localhost:5173`).

## Puerto

| Servicio    | Puerto |
|-------------|--------|
| api-gateway | 8080   |

## Tabla de rutas

| Ruta                         | Destino              | Autenticación |
|------------------------------|----------------------|---------------|
| `POST /auth/login`           | auth-service         | Publica       |
| `POST /auth/register`        | auth-service         | Publica       |
| `POST /auth/reset-password`  | auth-service         | Publica       |
| `GET/PUT /auth/me`           | auth-service         | JWT           |
| `GET /prices/**`             | price-service        | Publica       |
| `GET/POST /alerts/**`        | price-service        | JWT           |
| `/transactions/**`           | transaction-service  | JWT           |
| `/orders/**, /portfolio/**`  | trading-service      | JWT           |
| `GET /assets/**`             | trading-service      | Publica       |
| `/admin/**`                  | auth-service         | Admin         |

## Tecnologías

- Spring Cloud Gateway (reactivo, WebFlux)
- Spring Cloud Netflix Eureka Client
- JJWT 0.12.5
- Java 21

## Variables de entorno

| Variable     | Descripción                        | Valor por defecto                      |
|--------------|------------------------------------|----------------------------------------|
| `JWT_SECRET` | Clave HMAC para verificar tokens   | `payflow-super-secret-key-2024-tfg`    |
| `EUREKA_URI` | URL del servidor Eureka            | `http://localhost:8761/eureka`         |

## Dependencias

Requiere que **discovery-service** esté en marcha antes de arrancar.
