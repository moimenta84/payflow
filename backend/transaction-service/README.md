# Transaction Service

Microservicio de gestión de transacciones financieras (ingresos y gastos) de PayFlow.

## Responsabilidad

- **CRUD de transacciones**: crear, listar, actualizar y eliminar transacciones del usuario.
- **Resumen financiero** (`GET /transactions/summary`): devuelve el total de ingresos, gastos y balance neto.
- **Informes PDF** (`GET /transactions/report/pdf`): genera y descarga un informe mensual en PDF con el detalle de movimientos.
- **Mensajería**: publica eventos de transacción en un topic de ActiveMQ Artemis para que el `trading-service` pueda reaccionar a ellos.

## Puerto

| Servicio            | Puerto |
|---------------------|--------|
| transaction-service | 8082   |

## Endpoints

| Método | Ruta                         | Descripción                              |
|--------|------------------------------|------------------------------------------|
| POST   | `/transactions`              | Crea una nueva transacción               |
| GET    | `/transactions`              | Lista todas las transacciones del usuario|
| PUT    | `/transactions/{id}`         | Actualiza una transacción existente      |
| DELETE | `/transactions/{id}`         | Elimina una transacción                  |
| GET    | `/transactions/summary`      | Resumen de ingresos, gastos y balance    |
| GET    | `/transactions/report/pdf`   | Descarga informe PDF mensual             |

Todos los endpoints requieren JWT (el gateway inyecta `X-User-Id` en la cabecera).

## Base de datos

PostgreSQL — base de datos `transactions_db`.

## Mensajería

Publica en ActiveMQ Artemis (modo embebido) para notificar al `trading-service` sobre nuevas transacciones.

## Tecnologías

- Spring Boot 3 + Spring Data JPA
- ActiveMQ Artemis (JMS embebido)
- iText / OpenPDF para generación de PDF
- Java 21

## Variables de entorno

| Variable     | Descripción                        | Valor por defecto                               |
|--------------|------------------------------------|-------------------------------------------------|
| `DB_URL`     | JDBC URL de la base de datos       | `jdbc:postgresql://localhost:5432/transactions_db` |
| `DB_USER`    | Usuario de la base de datos        | `postgres`                                      |
| `DB_PASS`    | Contraseña de la base de datos     | `payflow123`                                    |
| `EUREKA_URI` | URL del servidor Eureka            | `http://localhost:8761/eureka`                  |

## Dependencias

Requiere **discovery-service** activo para registrarse en Eureka.
