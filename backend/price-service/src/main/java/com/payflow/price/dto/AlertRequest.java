package com.payflow.price.dto;

import com.payflow.price.entity.PriceAlertEntity.Direction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class AlertRequest {

    @NotBlank(message = "El activo es obligatorio (bitcoin, ethereum...)")
    private String asset;

    @NotNull(message = "El precio objetivo es obligatorio")
    @Positive(message = "El precio debe ser mayor que cero")
    private Double targetPrice;

    @NotNull(message = "La dirección es obligatoria (ABOVE o BELOW)")
    private Direction direction;

    public String getAsset()          { return asset; }
    public Double getTargetPrice()    { return targetPrice; }
    public Direction getDirection()   { return direction; }

    public void setAsset(String asset)           { this.asset = asset; }
    public void setTargetPrice(Double p)         { this.targetPrice = p; }
    public void setDirection(Direction direction) { this.direction = direction; }
}
