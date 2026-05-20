package com.spendiq.trading.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String asset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Tipo tipo;

    @Column(nullable = false)
    private Double cantidad;

    @Column(nullable = false)
    private Double precioUnitario;

    @Column(nullable = false)
    private Double total;

    @Column(nullable = false)
    private LocalDateTime fecha;

    public enum Tipo { COMPRA, VENTA }

    public String        getId()             { return id; }
    public String        getUserId()         { return userId; }
    public String        getAsset()          { return asset; }
    public Tipo          getTipo()           { return tipo; }
    public Double        getCantidad()       { return cantidad; }
    public Double        getPrecioUnitario() { return precioUnitario; }
    public Double        getTotal()          { return total; }
    public LocalDateTime getFecha()          { return fecha; }

    public void setUserId(String userId)                  { this.userId         = userId; }
    public void setAsset(String asset)                    { this.asset          = asset; }
    public void setTipo(Tipo tipo)                        { this.tipo           = tipo; }
    public void setCantidad(Double cantidad)              { this.cantidad       = cantidad; }
    public void setPrecioUnitario(Double precioUnitario)  { this.precioUnitario = precioUnitario; }
    public void setTotal(Double total)                    { this.total          = total; }
    public void setFecha(LocalDateTime fecha)             { this.fecha          = fecha; }
}
