package com.spendiq.transaction.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "transactions")
public class TransactionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // No es FK — el userId lo pone el gateway en el header X-User-Id
    // Cada servicio es autónomo y no accede a la BD de otro
    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tipo tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Categoria categoria;

    private String descripcion;

    @Column(nullable = false)
    private Double cantidad;

    @Column(nullable = false)
    private LocalDate fecha;

    public enum Tipo { INGRESO, GASTO }

    public enum Categoria {
        SALARIO, ALIMENTACION, VIVIENDA, TRANSPORTE,
        SALUD, OCIO, EDUCACION, OTROS
    }

    // ─── Getters ──────────────────────────────────────────────

    public String getId()            { return id; }
    public String getUserId()        { return userId; }
    public Tipo getTipo()            { return tipo; }
    public Categoria getCategoria()  { return categoria; }
    public String getDescripcion()   { return descripcion; }
    public Double getCantidad()      { return cantidad; }
    public LocalDate getFecha()      { return fecha; }

    // ─── Setters ──────────────────────────────────────────────

    public void setUserId(String userId)           { this.userId = userId; }
    public void setTipo(Tipo tipo)                 { this.tipo = tipo; }
    public void setCategoria(Categoria categoria)  { this.categoria = categoria; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public void setCantidad(Double cantidad)       { this.cantidad = cantidad; }
    public void setFecha(LocalDate fecha)          { this.fecha = fecha; }
}
