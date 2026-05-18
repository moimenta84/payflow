package com.spendiq.transaction.dto;

import com.spendiq.transaction.entity.TransactionEntity.Categoria;
import com.spendiq.transaction.entity.TransactionEntity.Tipo;
import java.time.LocalDate;

public class TransactionRequest {

    private Tipo tipo;
    private Categoria categoria;
    private String descripcion;
    private Double cantidad;
    private LocalDate fecha;

    // ─── Getters ──────────────────────────────────────────────

    public Tipo getTipo()            { return tipo; }
    public Categoria getCategoria()  { return categoria; }
    public String getDescripcion()   { return descripcion; }
    public Double getCantidad()      { return cantidad; }
    public LocalDate getFecha()      { return fecha; }

    // ─── Setters ──────────────────────────────────────────────

    public void setTipo(Tipo tipo)                 { this.tipo = tipo; }
    public void setCategoria(Categoria categoria)  { this.categoria = categoria; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public void setCantidad(Double cantidad)       { this.cantidad = cantidad; }
    public void setFecha(LocalDate fecha)          { this.fecha = fecha; }
}
