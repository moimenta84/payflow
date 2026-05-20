package com.spendiq.auth.controller;

import com.spendiq.auth.dto.AuthResponse;
import com.spendiq.auth.dto.LoginRequest;
import com.spendiq.auth.dto.RegisterRequest;
import com.spendiq.auth.dto.UserResponse;
import com.spendiq.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// @RestController combina @Controller + @ResponseBody
// Indica que esta clase maneja peticiones HTTP y devuelve JSON directamente
@RestController

// Todas las rutas de esta clase empiezan por /auth
@RequestMapping("/auth")
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
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(authService.getUser(userId));
    }

    // ─────────────────────────────────────────────────────────
    // PUT /auth/me
    // Ruta protegida — requiere JWT
    // Permite actualizar nombre, apellido y saldoInicial
    // No permite cambiar email ni rol
    // ─────────────────────────────────────────────────────────
    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMe(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.updateUser(userId, request));
    }

    // ─────────────────────────────────────────────────────────
    // POST /auth/reset-password
    // Ruta pública — no requiere JWT (el usuario no puede hacer login)
    // Recibe solo el email en el body
    // ─────────────────────────────────────────────────────────
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody LoginRequest request) {
        // Reutilizamos LoginRequest — solo usamos el campo email
        authService.resetPassword(request.getEmail());
        // Siempre devolvemos el mismo mensaje — no revelamos si el email existe
        return ResponseEntity.ok("Si el email existe recibirás un correo");
    }
}
