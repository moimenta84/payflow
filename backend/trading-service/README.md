# Trading Service

Microservicio de compraventa de criptomonedas y gestión de cartera de PayFlow.

## Responsabilidad

- **Órdenes** (`/orders`): permite al usuario crear órdenes de compra/venta de criptomonedas y consultar su historial.
- **Cartera** (`/portfolio`): devuelve los activos que posee el usuario, su cantidad y valoración actual al precio de mercado.
- **Activos** (`/assets`): expone el catálogo de criptomonedas disponibles para operar.
- **Consumo de precios**: escucha el topic de ActiveMQ Artemis en el que `price-service` publica precios cada 30 segundos para mantener la valoración de las carteras actualizada.
- **Consumo de transacciones**: reacciona a eventos del `transaction-service` cuando es necesario.

## Puerto

| Servicio        | Puerto |
|-----------------|--------|
| trading-service | 8083   |

## Endpoints

| Método | Ruta          | Auth | Descripción                                      |
|--------|---------------|------|--------------------------------------------------|
| POST   | `/orders`     | JWT  | Crea una orden de compra o venta                 |
| GET    | `/orders`     | JWT  | Historial de órdenes del usuario                 |
| GET    | `/portfolio`  | JWT  | Cartera del usuario con valoración actual        |
| GET    | `/assets`     | No   | Lista de criptomonedas disponibles               |

## Activos soportados

`bitcoin`, `ethereum`, `solana`, `ripple`

## Base de datos

PostgreSQL — base de datos `trading_db`.

## Mensajería

Consume mensajes de ActiveMQ Artemis (modo embebido) publicados por `price-service` (precios) y `transaction-service` (eventos de transacción).

## Tecnologías

- Spring Boot 3 + Spring Data JPA
- ActiveMQ Artemis (JMS embebido)
- Java 21

## Variables de entorno

| Variable     | Descripción                      | Valor por defecto                            |
|--------------|----------------------------------|----------------------------------------------|
| `DB_URL`     | JDBC URL de la base de datos     | `jdbc:postgresql://localhost:5432/trading_db`|
| `DB_USER`    | Usuario de la base de datos      | `postgres`                                   |
| `DB_PASS`    | Contraseña de la base de datos   | `payflow123`                                 |
| `EUREKA_URI` | URL del servidor Eureka          | `http://localhost:8761/eureka`               |

## Dependencias

Requiere **discovery-service** y **price-service** activos.
