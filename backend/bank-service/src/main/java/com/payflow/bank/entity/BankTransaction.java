package com.payflow.bank.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

// Entidad JPA: un movimiento traído del banco real. externalId evita duplicados al sincronizar. Tabla "bank_transactions".
@Entity
@Table(name = "bank_transactions")
public class BankTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    private String bankConnectionId;

    @Column(unique = true)
    private String externalId;

    private Double amount;
    private String currency;

    @Column(length = 512)
    private String description;

    private LocalDate bookingDate;
    private boolean importedToPayflow = false;

    public String getId()               { return id; }
    public String getUserId()           { return userId; }
    public String getBankConnectionId() { return bankConnectionId; }
    public String getExternalId()       { return externalId; }
    public Double getAmount()           { return amount; }
    public String getCurrency()         { return currency; }
    public String getDescription()      { return description; }
    public LocalDate getBookingDate()   { return bookingDate; }
    public boolean isImportedToPayflow(){ return importedToPayflow; }

    public void setUserId(String v)            { this.userId = v; }
    public void setBankConnectionId(String v)  { this.bankConnectionId = v; }
    public void setExternalId(String v)        { this.externalId = v; }
    public void setAmount(Double v)            { this.amount = v; }
    public void setCurrency(String v)          { this.currency = v; }
    public void setDescription(String v)       { this.description = v; }
    public void setBookingDate(LocalDate v)    { this.bookingDate = v; }
    public void setImportedToPayflow(boolean v){ this.importedToPayflow = v; }
}
