package com.payflow.wallet.dto;

import com.payflow.wallet.entity.LedgerEntry;

import java.time.LocalDateTime;

public class LedgerEntryResponse {
    private String id;
    private String type;
    private Double amount;
    private Double balanceAfter;
    private String description;
    private String counterpartyUserId;
    private String correlationId;
    private LocalDateTime createdAt;

    public LedgerEntryResponse() {}

    public LedgerEntryResponse(LedgerEntry e) {
        this.id = e.getId();
        this.type = e.getType().name();
        this.amount = e.getAmount();
        this.balanceAfter = e.getBalanceAfter();
        this.description = e.getDescription();
        this.counterpartyUserId = e.getCounterpartyUserId();
        this.correlationId = e.getCorrelationId();
        this.createdAt = e.getCreatedAt();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
    public Double getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(Double balanceAfter) { this.balanceAfter = balanceAfter; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCounterpartyUserId() { return counterpartyUserId; }
    public void setCounterpartyUserId(String counterpartyUserId) { this.counterpartyUserId = counterpartyUserId; }
    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
