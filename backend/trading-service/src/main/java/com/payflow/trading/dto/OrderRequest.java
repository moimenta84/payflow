package com.payflow.trading.dto;

import com.payflow.trading.entity.OrderEntity.Tipo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class OrderRequest {

    @NotBlank(message = "El activo es obligatorio (bitcoin, ethereum...)")
    private String asset;

    @NotNull(message = "El tipo es obligatorio (COMPRA o VENTA)")
    private Tipo tipo;

    @NotNull(message = "La cantidad es obligatoria")
    @Positive(message = "La cantidad debe ser mayor que cero")
    private Double cantidad;

    public String getAsset()    { return asset; }
    public Tipo   getTipo()     { return tipo; }
    public Double getCantidad() { return cantidad; }

    public void setAsset(String asset)   { this.asset    = asset; }
    public void setTipo(Tipo tipo)       { this.tipo     = tipo; }
    public void setCantidad(Double c)    { this.cantidad = c; }
}
