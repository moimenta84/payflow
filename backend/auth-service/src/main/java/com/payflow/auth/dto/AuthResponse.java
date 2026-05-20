package com.payflow.auth.dto;

// DTO que devuelve el servidor tras un login o registro exitoso
// El frontend guarda el token en localStorage y lo manda en cada petición
public class AuthResponse {

    // JWT que el frontend usará como identificación en cada petición
    // Se manda en el header: Authorization: Bearer <token>
    private String token;

    // Datos públicos del usuario — sin campos internos de la entidad
    private UserResponse user;

    // Constructor — se usa en el servicio: new AuthResponse(token, userResponse)
    public AuthResponse(String token, UserResponse user) {
        this.token = token;
        this.user  = user;
    }

    // ─── Getters ──────────────────────────────────────────────

    public String getToken() { return token; }

    public UserResponse getUser() { return user; }
}
