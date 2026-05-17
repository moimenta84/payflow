package com.spendiq.auth.dto;

// DTO que viaja desde el frontend al backend cuando el usuario inicia sesión
// Solo necesita email y password — nada más
public class LoginRequest {

    private String email;

    // Contraseña en texto plano — el servicio la compara con el hash BCrypt de la BD
    private String password;

    // ─── Getters ──────────────────────────────────────────────

    public String getEmail() { return email; }

    public String getPassword() { return password; }

    // ─── Setters ──────────────────────────────────────────────

    public void setEmail(String email) { this.email = email; }

    public void setPassword(String password) { this.password = password; }
}
