package com.payflow.bank.dto;

import com.payflow.bank.entity.BankTransaction;
import java.time.LocalDate;

public class BankTransactionResponse {
    private String id;
    private Double amount;
    private String currency;
    private String description;
    private LocalDate bookingDate;
    private boolean importedToPayflow;

    public BankTransactionResponse(BankTransaction t) {
        this.id                = t.getId();
        this.amount            = t.getAmount();
        this.currency          = t.getCurrency();
        this.description       = t.getDescription();
        this.bookingDate       = t.getBookingDate();
        this.importedToPayflow = t.isImportedToPayflow();
    }

    public String getId()               { return id; }
    public Double getAmount()           { return amount; }
    public String getCurrency()         { return currency; }
    public String getDescription()      { return description; }
    public LocalDate getBookingDate()   { return bookingDate; }
    public boolean isImportedToPayflow(){ return importedToPayflow; }
}
