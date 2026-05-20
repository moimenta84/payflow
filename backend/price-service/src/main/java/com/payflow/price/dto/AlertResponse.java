package com.payflow.price.dto;

import com.payflow.price.entity.PriceAlertEntity;

import java.time.LocalDateTime;

public class AlertResponse {

    private String id;
    private String asset;
    private Double targetPrice;
    private String direction;
    private boolean triggered;
    private LocalDateTime createdAt;
    private LocalDateTime triggeredAt;

    public AlertResponse(PriceAlertEntity e) {
        this.id          = e.getId();
        this.asset       = e.getAsset();
        this.targetPrice = e.getTargetPrice();
        this.direction   = e.getDirection().name();
        this.triggered   = e.isTriggered();
        this.createdAt   = e.getCreatedAt();
        this.triggeredAt = e.getTriggeredAt();
    }

    public String getId()              { return id; }
    public String getAsset()           { return asset; }
    public Double getTargetPrice()     { return targetPrice; }
    public String getDirection()       { return direction; }
    public boolean isTriggered()       { return triggered; }
    public LocalDateTime getCreatedAt()   { return createdAt; }
    public LocalDateTime getTriggeredAt() { return triggeredAt; }
}
