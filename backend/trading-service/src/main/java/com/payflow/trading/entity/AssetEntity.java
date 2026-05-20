package com.payflow.trading.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets")
public class AssetEntity {

    // El id es el nombre del activo: "bitcoin", "ethereum", etc.
    @Id
    private String id;

    @Column(nullable = false)
    private Double priceUsd;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public AssetEntity() {}

    public AssetEntity(String id, Double priceUsd, LocalDateTime updatedAt) {
        this.id        = id;
        this.priceUsd  = priceUsd;
        this.updatedAt = updatedAt;
    }

    public String        getId()        { return id; }
    public Double        getPriceUsd()  { return priceUsd; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setPriceUsd(Double priceUsd)   { this.priceUsd  = priceUsd; }
    public void setUpdatedAt(LocalDateTime t)   { this.updatedAt = t; }
}
