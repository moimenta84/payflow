package com.payflow.auth.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

// @Entity le dice a JPA/Hibernate que esta clase representa una tabla en la BD
@Entity

// @Table define el nombre exacto de la tabla en PostgreSQL
// Hibernate la crea automáticamente al arrancar gracias a ddl-auto=update
@Table(name = "users")
public class UserEntity {

    // Clave primaria — Hibernate genera un UUID automáticamente al hacer save()
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // unique=true → no pueden existir dos usuarios con el mismo email
    // nullable=false → campo obligatorio a nivel de base de datos
    @Column(unique = true, nullable = false)
    private String email;

    // La contraseña nunca se guarda en texto plano
    // El servicio la cifra con BCrypt antes de llamar a save()
    // @JsonIgnore evita que la contraseña viaje en las respuestas JSON
    // Es el equivalente al $hidden de Laravel
    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nombre;

    // Opcional — no tiene restricciones en BD
    private String apellido;

    // Teléfono del usuario, identificador para enviar dinero P2P (estilo Bizum).
    // Se guarda normalizado (solo dígitos). Opcional: los usuarios sin teléfono
    // no pueden recibir envíos por número.
    private String telefono;

    // Saldo de partida del usuario para calcular el balance real en el dashboard
    // Por defecto 0.0 si no se especifica al registrarse
    private Double saldoInicial = 0.0;

    // EnumType.STRING guarda "USER" o "ADMIN" como texto en la BD
    // Si usáramos EnumType.ORDINAL guardaría 0 o 1, lo cual es menos legible
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Rol rol = Rol.USER; // Todo usuario nuevo es USER por defecto

    // Roles disponibles en la plataforma
    // USER  → acceso normal (wallet, transacciones, trading)
    // ADMIN → gestión de la plataforma (futuras rutas /admin/**)
    public enum Rol { USER, ADMIN }

    // Plan de suscripción del usuario. Por defecto FREE; AUTONOMOS se
    // activa tras un pago confirmado en Stripe (4,99€/mes).
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Plan plan = Plan.FREE;

    // IDs que devuelve Stripe — permiten relacionar al usuario con su cliente
    // y su suscripción en Stripe (nulos mientras el plan sea FREE)
    private String stripeCustomerId;
    private String stripeSubscriptionId;

    public enum Plan { FREE, AUTONOMOS }

    // ─── Getters ──────────────────────────────────────────────

    public String getId() { return id; }

    public String getEmail() { return email; }

    // @JsonIgnore está en el campo — el getter no hace falta ocultarlo
    public String getPassword() { return password; }

    public String getNombre() { return nombre; }

    public String getApellido() { return apellido; }

    public String getTelefono() { return telefono; }

    public Double getSaldoInicial() { return saldoInicial; }

    public Rol getRol() { return rol; }

    public Plan getPlan() { return plan; }

    public String getStripeCustomerId() { return stripeCustomerId; }

    public String getStripeSubscriptionId() { return stripeSubscriptionId; }

    // ─── Setters ──────────────────────────────────────────────
    // id no tiene setter — lo genera Hibernate, nunca se asigna manualmente

    public void setEmail(String email) { this.email = email; }

    public void setPassword(String password) { this.password = password; }

    public void setNombre(String nombre) { this.nombre = nombre; }

    public void setApellido(String apellido) { this.apellido = apellido; }

    public void setTelefono(String telefono) { this.telefono = telefono; }

    public void setSaldoInicial(Double saldoInicial) { this.saldoInicial = saldoInicial; }

    public void setRol(Rol rol) { this.rol = rol; }

    public void setPlan(Plan plan) { this.plan = plan; }

    public void setStripeCustomerId(String stripeCustomerId) { this.stripeCustomerId = stripeCustomerId; }

    public void setStripeSubscriptionId(String stripeSubscriptionId) { this.stripeSubscriptionId = stripeSubscriptionId; }
}
