package com.payflow.transaction.dto;

public class SummaryResponse {

    private Double totalIngresos;
    private Double totalGastos;
    private Double balance;

    public SummaryResponse(Double totalIngresos, Double totalGastos) {
        this.totalIngresos = totalIngresos;
        this.totalGastos   = totalGastos;
        this.balance       = totalIngresos - totalGastos;
    }

    // ─── Getters ──────────────────────────────────────────────

    public Double getTotalIngresos() { return totalIngresos; }
    public Double getTotalGastos()   { return totalGastos; }
    public Double getBalance()       { return balance; }
}
