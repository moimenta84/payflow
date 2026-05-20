package com.spendiq.trading.dto;

import com.spendiq.trading.entity.OrderEntity.Tipo;

public class OrderRequest {

    private String asset;
    private Tipo   tipo;
    private Double cantidad;

    public String getAsset()    { return asset; }
    public Tipo   getTipo()     { return tipo; }
    public Double getCantidad() { return cantidad; }

    public void setAsset(String asset)     { this.asset    = asset; }
    public void setTipo(Tipo tipo)         { this.tipo     = tipo; }
    public void setCantidad(Double c)      { this.cantidad = c; }
}
