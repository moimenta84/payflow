package com.payflow.wallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class SendMoneyRequest {

    @NotBlank(message = "El destinatario es obligatorio")
    private String toUserId;

    @NotNull(message = "El importe es obligatorio")
    @Positive(message = "El importe debe ser mayor que cero")
    private Double amount;

    @Size(max = 200, message = "La descripción no puede exceder 200 caracteres")
    private String description;

    public String getToUserId() { return toUserId; }
    public void setToUserId(String toUserId) { this.toUserId = toUserId; }
    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
