package com.payflow.price.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "price_alerts")
public class PriceAlertEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String userEmail;

    @Column(nullable = false)
    private String asset;

    @Column(nullable = false)
    private Double targetPrice;

    // ABOVE → alerta cuando el precio sube por encima
    // BELOW → alerta cuando el precio baja por debajo
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    private boolean triggered = false;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime triggeredAt;

    public enum Direction { ABOVE, BELOW }

    public String getId()              { return id; }
    public String getUserId()          { return userId; }
    public String getUserEmail()       { return userEmail; }
    public String getAsset()           { return asset; }
    public Double getTargetPrice()     { return targetPrice; }
    public Direction getDirection()    { return direction; }
    public boolean isTriggered()       { return triggered; }
    public LocalDateTime getCreatedAt()   { return createdAt; }
    public LocalDateTime getTriggeredAt() { return triggeredAt; }

    public void setUserId(String userId)         { this.userId = userId; }
    public void setUserEmail(String userEmail)   { this.userEmail = userEmail; }
    public void setAsset(String asset)           { this.asset = asset; }
    public void setTargetPrice(Double p)         { this.targetPrice = p; }
    public void setDirection(Direction direction) { this.direction = direction; }
    public void setTriggered(boolean triggered)  { this.triggered = triggered; }
    public void setTriggeredAt(LocalDateTime t)  { this.triggeredAt = t; }
}
