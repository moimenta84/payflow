package com.payflow.trading.dto;

import com.payflow.trading.entity.PortfolioEntry;

public class PortfolioResponse {

    private String asset;
    private Double cantidad;
    private Double precioActual;
    private Double valorTotal;

    public PortfolioResponse(PortfolioEntry entry, Double precioActual) {
        this.asset       = entry.getAsset();
        this.cantidad    = entry.getCantidad();
        this.precioActual = precioActual;
        this.valorTotal  = entry.getCantidad() * precioActual;
    }

    public String getAsset()        { return asset; }
    public Double getCantidad()     { return cantidad; }
    public Double getPrecioActual() { return precioActual; }
    public Double getValorTotal()   { return valorTotal; }
}
