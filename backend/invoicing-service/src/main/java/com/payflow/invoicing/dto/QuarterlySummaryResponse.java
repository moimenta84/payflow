package com.payflow.invoicing.dto;

public class QuarterlySummaryResponse {
    private int year;
    private int quarter;
    private Double totalIngresos;
    private Double totalBaseImponible;
    private Double ivaRepercutido;
    private Double ivaSoportado;
    private Double resultado303;
    private Double baseIRPF;
    private Double retencionesIRPF;
    private Double pagoFraccionado130;

    public QuarterlySummaryResponse(int year, int quarter,
                                     Double totalIngresos, Double totalBaseImponible,
                                     Double ivaRepercutido, Double ivaSoportado, Double resultado303,
                                     Double baseIRPF, Double retencionesIRPF, Double pagoFraccionado130) {
        this.year               = year;
        this.quarter            = quarter;
        this.totalIngresos      = totalIngresos;
        this.totalBaseImponible = totalBaseImponible;
        this.ivaRepercutido     = ivaRepercutido;
        this.ivaSoportado       = ivaSoportado;
        this.resultado303       = resultado303;
        this.baseIRPF           = baseIRPF;
        this.retencionesIRPF    = retencionesIRPF;
        this.pagoFraccionado130 = pagoFraccionado130;
    }

    public int getYear()                  { return year; }
    public int getQuarter()               { return quarter; }
    public Double getTotalIngresos()      { return totalIngresos; }
    public Double getTotalBaseImponible() { return totalBaseImponible; }
    public Double getIvaRepercutido()     { return ivaRepercutido; }
    public Double getIvaSoportado()       { return ivaSoportado; }
    public Double getResultado303()       { return resultado303; }
    public Double getBaseIRPF()           { return baseIRPF; }
    public Double getRetencionesIRPF()    { return retencionesIRPF; }
    public Double getPagoFraccionado130() { return pagoFraccionado130; }
}
