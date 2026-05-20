# auth-service

**Puerto:** 8081 | **BD:** `auth_db` | **Responsabilidad:** Gestión de usuarios, autenticación y emisión de JWT

---

## Estructura

```
auth-service/src/main/java/com/spendiq/auth/
├── AuthApplication.java
├── config/
│   └── SecurityConfig.java        → Spring Security (CSRF off, todo permitAll — el gateway filtra)
├── controller/
│   └── AuthController.java        → 5 endpoints REST
├── dto/
│   ├── RegisterRequest.java       → nombre, apellido, email, telefono, password, saldoInicial
│   ├── LoginRequest.java          → email, password
│   ├── AuthResponse.java          → token + UserResponse
│   └── UserResponse.java          → id, email, fullName, iniciales, saldoInicial, rol
├── entity/
│   └── UserEntity.java            → tabla "users" — incluye enum Rol { USER, ADMIN }
├── repository/
│   └── UserRepository.java        → findByEmail, existsByEmail
└── service/
    └── AuthService.java           → register, login, getUser, updateUser, resetPassword, generateToken
```

---

## Endpoints

| Método | Ruta | JWT | Descripción |
|---|---|---|---|
| POST | `/auth/register` | No | Crear cuenta |
| POST | `/auth/login` | No | Iniciar sesión |
| GET | `/auth/me` | Sí | Perfil del usuario |
| PUT | `/auth/me` | Sí | Actualizar perfil |
| POST | `/auth/reset-password` | No | Recuperar contraseña (pendiente email) |

---

## Modelo — tabla `users`

| Campo | Tipo | Restricciones |
|---|---|---|
| id | UUID | PK, auto-generado |
| email | VARCHAR | UNIQUE, NOT NULL |
| password | VARCHAR | NOT NULL, hash BCrypt — nunca texto plano |
| nombre | VARCHAR | NOT NULL |
| apellido | VARCHAR | nullable |
| telefono | VARCHAR | nullable |
| saldoInicial | DOUBLE | default 0.0 |
| rol | ENUM | NOT NULL, default USER |

---

## UserResponse — campos que recibe el frontend

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "Nombre Apellido",
  "iniciales": "NA",
  "saldoInicial": 0.0,
  "rol": "USER"
}
```

> El frontend debe usar `fullName` (no `nombre`) y `iniciales` (no `avatar`).

---

## Roles

```java
public enum Rol { USER, ADMIN }
```

- Todo usuario nuevo recibe `USER` al registrarse
- `ADMIN` solo se asigna desde el panel de administración (`PUT /admin/users/{id}/rol`)
- El rol viaja en el JWT como claim y en la respuesta como `rol`

---

## JWT — estructura del token

```
Header:  { alg: "HS256", typ: "JWT" }
Payload: {
  sub:    "uuid-del-usuario",
  email:  "user@example.com",
  nombre: "Nombre",
  rol:    "USER",
  iat:    1716000000,
  exp:    1716086400   ← 24h después
}
Firma:   HMAC-SHA256(header + payload, JWT_SECRET)
```

Secret: `payflow-super-secret-key-2024-tfg` (mismo en gateway y auth-service)

---

## Flujo de registro

```
POST /auth/register → AuthController → AuthService
  1. ¿Email ya existe?  → 500 "El email ya está registrado"
  2. Cifrar password    → BCrypt (salt aleatorio, irreversible)
  3. Guardar en BD      → INSERT INTO users
  4. Generar JWT        → sub=userId, email, nombre, rol
  5. Retornar           → { token, user: UserResponse }
```

## Flujo de login

```
POST /auth/login → AuthService
  1. Buscar por email    → si no existe → "Credenciales incorrectas" (mismo msg por seguridad)
  2. BCrypt.matches()    → si no coincide → "Credenciales incorrectas"
  3. Generar JWT
  4. Retornar { token, user: UserResponse }
```

---

## Pruebas con curl

```bash
# Registrar
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Iker","apellido":"Martinez","email":"iker@payflow.com","password":"Test1234!"}'

# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"iker@payflow.com","password":"Test1234!"}'

# Perfil
curl http://localhost:8080/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Pendiente

- `@Valid` + `@NotBlank` + `@Email` en RegisterRequest y LoginRequest
- Endpoint `GET /admin/users` — listar usuarios (solo ADMIN)
- Endpoint `PUT /admin/users/{id}/rol` — cambiar rol (solo ADMIN)
- Email de bienvenida al registrarse (Spring Mail)
- Implementar `reset-password` con envío real de email
