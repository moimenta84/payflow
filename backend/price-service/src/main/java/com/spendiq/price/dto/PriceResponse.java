package com.spendiq.price.dto;

import java.time.LocalDateTime;

public class PriceResponse {

    private String asset;
    private Double priceUsd;
    private LocalDateTime updatedAt;

    public PriceResponse(String asset, Double priceUsd, LocalDateTime updatedAt) {
        this.asset      = asset;
        this.priceUsd   = priceUsd;
        this.updatedAt  = updatedAt;
    }

    public String        getAsset()     { return asset; }
    public Double        getPriceUsd()  { return priceUsd; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
