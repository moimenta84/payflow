package com.spendiq.auth.dto;

import com.spendiq.auth.entity.UserEntity;

// DTO que devuelve el servidor tras un login o registro exitoso
// El frontend guarda el token en localStorage y lo manda en cada petición
public class AuthResponse {

    // JWT que el frontend usará como identificación en cada petición
    // Se manda en el header: Authorization: Bearer <token>
    private String token;

    // Datos del usuario para mostrar en el dashboard sin hacer otra petición
    // La contraseña no viaja aquí — UserEntity la oculta con @JsonIgnore
    private UserEntity user;

    // Constructor — se usa en el servicio: new AuthResponse(token, user)
    public AuthResponse(String token, UserEntity user) {
        this.token = token;
        this.user  = user;
    }

    // ─── Getters ──────────────────────────────────────────────

    public String getToken() { return token; }

    public UserEntity getUser() { return user; }
}
