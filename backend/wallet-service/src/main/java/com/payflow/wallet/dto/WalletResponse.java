package com.payflow.wallet.dto;

import com.payflow.wallet.entity.WalletEntity;

public class WalletResponse {
    private String id;
    private String userId;
    private Double balance;
    private String currency;

    public WalletResponse() {}

    public WalletResponse(WalletEntity w) {
        this.id = w.getId();
        this.userId = w.getUserId();
        this.balance = w.getBalance();
        this.currency = w.getCurrency();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public Double getBalance() { return balance; }
    public void setBalance(Double balance) { this.balance = balance; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
}
