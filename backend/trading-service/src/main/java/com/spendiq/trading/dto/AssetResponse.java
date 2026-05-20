package com.spendiq.trading.dto;

import com.spendiq.trading.entity.AssetEntity;
import java.time.LocalDateTime;

public class AssetResponse {

    private String        id;
    private Double        priceUsd;
    private LocalDateTime updatedAt;

    public AssetResponse(AssetEntity a) {
        this.id        = a.getId();
        this.priceUsd  = a.getPriceUsd();
        this.updatedAt = a.getUpdatedAt();
    }

    public String        getId()        { return id; }
    public Double        getPriceUsd()  { return priceUsd; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
