package com.spendiq.trading.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "portfolio", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"userId", "asset"})
})
public class PortfolioEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String asset;

    @Column(nullable = false)
    private Double cantidad;

    public String getId()       { return id; }
    public String getUserId()   { return userId; }
    public String getAsset()    { return asset; }
    public Double getCantidad() { return cantidad; }

    public void setUserId(String userId)   { this.userId   = userId; }
    public void setAsset(String asset)     { this.asset    = asset; }
    public void setCantidad(Double c)      { this.cantidad = c; }
}
