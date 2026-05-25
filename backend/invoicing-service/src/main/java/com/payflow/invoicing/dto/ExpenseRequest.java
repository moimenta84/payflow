package com.payflow.invoicing.dto;

import com.payflow.invoicing.entity.ExpenseEntity;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

public class ExpenseRequest {
    private String descripcion;
    private String proveedor;

    @NotNull(message = "La base imponible es obligatoria")
    @Positive(message = "La base imponible debe ser positiva")
    private Double baseImponible;

    private LocalDate fecha;
    private ExpenseEntity.Categoria categoria;

    public String getDescripcion()          { return descripcion; }
    public String getProveedor()            { return proveedor; }
    public Double getBaseImponible()        { return baseImponible; }
    public LocalDate getFecha()             { return fecha; }
    public ExpenseEntity.Categoria getCategoria() { return categoria; }

    public void setDescripcion(String v)               { this.descripcion = v; }
    public void setProveedor(String v)                  { this.proveedor = v; }
    public void setBaseImponible(Double v)             { this.baseImponible = v; }
    public void setFecha(LocalDate v)                  { this.fecha = v; }
    public void setCategoria(ExpenseEntity.Categoria v){ this.categoria = v; }
}
