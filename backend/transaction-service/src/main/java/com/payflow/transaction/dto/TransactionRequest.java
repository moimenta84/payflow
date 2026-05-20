package com.payflow.transaction.dto;

import com.payflow.transaction.entity.TransactionEntity.Categoria;
import com.payflow.transaction.entity.TransactionEntity.Tipo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

public class TransactionRequest {

    @NotNull(message = "El tipo es obligatorio (INGRESO o GASTO)")
    private Tipo tipo;

    private Categoria categoria;

    @NotBlank(message = "La descripción es obligatoria")
    private String descripcion;

    @NotNull(message = "La cantidad es obligatoria")
    @Positive(message = "La cantidad debe ser un valor positivo")
    private Double cantidad;

    private LocalDate fecha;

    public Tipo getTipo()            { return tipo; }
    public Categoria getCategoria()  { return categoria; }
    public String getDescripcion()   { return descripcion; }
    public Double getCantidad()      { return cantidad; }
    public LocalDate getFecha()      { return fecha; }

    public void setTipo(Tipo tipo)                 { this.tipo = tipo; }
    public void setCategoria(Categoria categoria)  { this.categoria = categoria; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public void setCantidad(Double cantidad)       { this.cantidad = cantidad; }
    public void setFecha(LocalDate fecha)          { this.fecha = fecha; }
}
