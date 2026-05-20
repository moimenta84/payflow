package com.spendiq.trading.dto;

import com.spendiq.trading.entity.OrderEntity;
import java.time.LocalDateTime;

public class OrderResponse {

    private String        id;
    private String        userId;
    private String        asset;
    private String        tipo;
    private Double        cantidad;
    private Double        precioUnitario;
    private Double        total;
    private LocalDateTime fecha;

    public OrderResponse(OrderEntity o) {
        this.id             = o.getId();
        this.userId         = o.getUserId();
        this.asset          = o.getAsset();
        this.tipo           = o.getTipo().name();
        this.cantidad       = o.getCantidad();
        this.precioUnitario = o.getPrecioUnitario();
        this.total          = o.getTotal();
        this.fecha          = o.getFecha();
    }

    public String        getId()             { return id; }
    public String        getUserId()         { return userId; }
    public String        getAsset()          { return asset; }
    public String        getTipo()           { return tipo; }
    public Double        getCantidad()       { return cantidad; }
    public Double        getPrecioUnitario() { return precioUnitario; }
    public Double        getTotal()          { return total; }
    public LocalDateTime getFecha()          { return fecha; }
}
