# Price Service

Microservicio de precios de criptomonedas y alertas de precio de PayFlow.

## Responsabilidad

- **Consulta periódica de precios**: cada 30 segundos solicita los precios actuales de las criptomonedas configuradas a la API pública de **CoinGecko** y los almacena en una caché en memoria.
- **API de precios**: expone los precios en tiempo real para que el frontend y el `trading-service` puedan consultarlos.
- **Publicación de precios**: envía cada actualización a un topic de ActiveMQ Artemis para que el `trading-service` actualice la valoración de las carteras sin hacer polling.
- **Alertas de precio**: los usuarios pueden crear alertas con un precio objetivo; cuando el precio del activo supera o iguala el umbral, el servicio envía un email de notificación.

## Puerto

| Servicio      | Puerto |
|---------------|--------|
| price-service | 8084   |

## Endpoints

| Método | Ruta            | Auth | Descripción                                      |
|--------|-----------------|------|--------------------------------------------------|
| GET    | `/prices`       | No   | Lista todos los activos con su precio actual     |
| GET    | `/prices/{asset}` | No | Precio actual de un activo concreto (p. ej. `bitcoin`) |
| POST   | `/alerts`       | JWT  | Crea una alerta de precio para un activo         |
| GET    | `/alerts`       | JWT  | Lista las alertas activas del usuario            |
| DELETE | `/alerts/{id}`  | JWT  | Elimina una alerta                               |

## Activos monitorizados

`bitcoin`, `ethereum`, `solana`, `ripple`

## Base de datos

PostgreSQL — base de datos `price_db` (para persistir las alertas de precio).

## Mensajería

Publica precios en ActiveMQ Artemis (modo embebido) consumidos por el `trading-service`.

## Tecnologías

- Spring Boot 3 + Spring WebFlux (WebClient para llamar a CoinGecko)
- Spring Data JPA
- ActiveMQ Artemis (JMS embebido)
- JavaMailSender (SMTP Gmail) para notificaciones de alerta
- Java 21

## Variables de entorno

| Variable            | Descripción                       | Valor por defecto                           |
|---------------------|-----------------------------------|---------------------------------------------|
| `DB_PASS`           | Contraseña de la base de datos    | `payflow123`                                |
| `MAIL_USER`         | Cuenta Gmail para envío de email  | —                                           |
| `MAIL_PASS`         | Contraseña de app de Gmail        | —                                           |
| `EUREKA_URI`        | URL del servidor Eureka           | `http://localhost:8761/eureka`              |
| `app.price.interval`| Intervalo de actualización (ms)   | `30000` (30 s)                              |

## Dependencias

Requiere **discovery-service** activo para registrarse en Eureka. Necesita acceso a internet para contactar con la API de CoinGecko.
