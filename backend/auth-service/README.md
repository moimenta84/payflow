# Auth Service

Microservicio de autenticación y gestión de usuarios de PayFlow.

## Responsabilidad

- **Registro** (`POST /auth/register`): crea un nuevo usuario, hashea la contraseña con BCrypt y devuelve un JWT.
- **Login** (`POST /auth/login`): valida credenciales y devuelve un JWT con `userId`, `email` y `rol` como claims.
- **Perfil** (`GET /auth/me`, `PUT /auth/me`): consulta y actualiza los datos del usuario autenticado.
- **Recuperación de contraseña** (`POST /auth/reset-password`): genera una contraseña temporal y la envía por email vía SMTP.
- **Panel admin** (`/admin/**`): permite al rol `ADMIN` listar usuarios, cambiar su rol y eliminarlos.

## Puerto

| Servicio     | Puerto |
|--------------|--------|
| auth-service | 8081   |

## Endpoints

| Método | Ruta                    | Auth   | Descripción                          |
|--------|-------------------------|--------|--------------------------------------|
| POST   | `/auth/register`        | No     | Registro de nuevo usuario            |
| POST   | `/auth/login`           | No     | Login, devuelve JWT                  |
| GET    | `/auth/me`              | JWT    | Datos del usuario actual             |
| PUT    | `/auth/me`              | JWT    | Actualiza nombre/apellido/saldo      |
| POST   | `/auth/reset-password`  | No     | Envía contraseña temporal por email  |
| GET    | `/admin/users`          | Admin  | Lista todos los usuarios             |
| PUT    | `/admin/users/{id}/rol` | Admin  | Cambia el rol de un usuario          |
| DELETE | `/admin/users/{id}`     | Admin  | Elimina un usuario                   |

## Base de datos

PostgreSQL — base de datos `auth_db`.

## Tecnologías

- Spring Boot 3 + Spring Security
- Spring Data JPA + Hibernate
- JJWT 0.12.5
- BCrypt para hashing de contraseñas
- JavaMailSender (SMTP Gmail) para emails
- Java 21

## Variables de entorno

| Variable     | Descripción                      | Valor por defecto                      |
|--------------|----------------------------------|----------------------------------------|
| `DB_URL`     | JDBC URL de la base de datos     | `jdbc:postgresql://localhost:5432/auth_db` |
| `DB_USER`    | Usuario de la base de datos      | `postgres`                             |
| `DB_PASS`    | Contraseña de la base de datos   | `payflow123`                           |
| `JWT_SECRET` | Clave HMAC para firmar tokens    | `payflow-super-secret-key-2024-tfg`    |
| `MAIL_USER`  | Cuenta Gmail para envío de email | —                                      |
| `MAIL_PASS`  | Contraseña de app de Gmail       | —                                      |
| `EUREKA_URI` | URL del servidor Eureka          | `http://localhost:8761/eureka`         |

## Dependencias

Requiere **discovery-service** activo para registrarse en Eureka.
