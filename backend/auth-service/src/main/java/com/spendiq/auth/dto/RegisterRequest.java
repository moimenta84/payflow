package com.spendiq.auth.dto;

// DTO (Data Transfer Object) — objeto que viaja desde el frontend al backend
// Solo contiene los datos que el usuario manda al registrarse
// No es una entidad — no se guarda directamente en la BD
public class RegisterRequest {

    // Email que usará para iniciar sesión
    private String email;

    // Contraseña en texto plano — el servicio la cifrará con BCrypt antes de guardarla
    private String password;

    private String nombre;

    private String apellido;

    // Saldo inicial opcional — si no se manda, el servicio lo pone a 0.0 por defecto
    private Double saldoInicial;

    // ─── Getters ──────────────────────────────────────────────

    public String getEmail() { return email; }

    public String getPassword() { return password; }

    public String getNombre() { return nombre; }

    public String getApellido() { return apellido; }

    public Double getSaldoInicial() { return saldoInicial; }

    // ─── Setters ──────────────────────────────────────────────

    public void setEmail(String email) { this.email = email; }

    public void setPassword(String password) { this.password = password; }

    public void setNombre(String nombre) { this.nombre = nombre; }

    public void setApellido(String apellido) { this.apellido = apellido; }

    public void setSaldoInicial(Double saldoInicial) { this.saldoInicial = saldoInicial; }
}
