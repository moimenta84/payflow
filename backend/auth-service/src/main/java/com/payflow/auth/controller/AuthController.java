package com.payflow.auth.controller;

import com.payflow.auth.dto.AuthResponse;
import com.payflow.auth.dto.LoginRequest;
import com.payflow.auth.dto.RegisterRequest;
import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// @RestController combina @Controller + @ResponseBody
// Indica que esta clase maneja peticiones HTTP y devuelve JSON directamente
@RestController

// Todas las rutas de esta clase empiezan por /auth
@RequestMapping("/auth")
@Tag(name = "Autenticación", description = "Registro, login y gestión del perfil del usuario")
public class AuthController {

    private final AuthService authService;

    // Inyección por constructor — Spring inyecta el AuthService automáticamente
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ─────────────────────────────────────────────────────────
    // POST /auth/register
    // Ruta pública — no requiere JWT
    // El gateway NO aplica el filtro JwtAuthFilter a esta ruta
    // ─────────────────────────────────────────────────────────
    @Operation(summary = "Registrar usuario", description = "Crea una cuenta nueva y devuelve un token JWT")
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        // @RequestBody deserializa el JSON que manda el frontend a un RegisterRequest
        // ResponseEntity nos permite controlar el código HTTP de la respuesta
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response); // 200 OK + token + datos usuario
    }

    // ─────────────────────────────────────────────────────────
    // POST /auth/login
    // Ruta pública — no requiere JWT
    // ─────────────────────────────────────────────────────────
    @Operation(summary = "Iniciar sesión", description = "Valida credenciales y devuelve un token JWT")
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response); // 200 OK + token + datos usuario
    }

    // ─────────────────────────────────────────────────────────
    // GET /auth/me
    // Ruta protegida — requiere JWT
    // El gateway valida el token y mete el userId en el header X-User-Id
    // El controlador lo recoge con @RequestHeader sin tocar el JWT directamente
    // ─────────────────────────────────────────────────────────
    @Operation(summary = "Obtener perfil", description = "Devuelve los datos del usuario autenticado")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(
            @Parameter(in = ParameterIn.HEADER, description = "ID de usuario inyectado por el gateway")
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(authService.getUser(userId));
    }

    // ─────────────────────────────────────────────────────────
    // PUT /auth/me
    // Ruta protegida — requiere JWT
    // Permite actualizar nombre, apellido y saldoInicial
    // No permite cambiar email ni rol
    // ─────────────────────────────────────────────────────────
    @Operation(summary = "Actualizar perfil", description = "Actualiza nombre, apellido y saldo inicial (no email ni rol)")
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @Parameter(in = ParameterIn.HEADER, description = "ID de usuario inyectado por el gateway")
            @RequestHeader("X-User-Id") String userId,
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.updateUser(userId, request));
    }

    // ─────────────────────────────────────────────────────────
    // POST /auth/reset-password
    // Ruta pública — no requiere JWT (el usuario no puede hacer login)
    // Recibe solo el email en el body
    // ─────────────────────────────────────────────────────────
    @Operation(summary = "Restablecer contraseña", description = "Envía un correo de recuperación si el email existe")
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody LoginRequest request) {
        // Reutilizamos LoginRequest — solo usamos el campo email
        authService.resetPassword(request.getEmail());
        // Siempre devolvemos el mismo mensaje — no revelamos si el email existe
        return ResponseEntity.ok("Si el email existe recibirás un correo");
    }
}
