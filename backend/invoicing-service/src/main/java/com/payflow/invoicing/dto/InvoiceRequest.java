package com.payflow.invoicing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;

public class InvoiceRequest {
    @NotBlank(message = "El nombre del cliente es obligatorio")
    private String clienteNombre;
    private String clienteNif;

    @NotBlank(message = "El concepto es obligatorio")
    private String concepto;

    @NotNull(message = "La base imponible es obligatoria")
    @Positive(message = "La base imponible debe ser positiva")
    private Double baseImponible;

    private Double tipoIva;
    private Double tipoIrpf;
    private LocalDate fecha;

    public String getClienteNombre()  { return clienteNombre; }
    public String getClienteNif()     { return clienteNif; }
    public String getConcepto()       { return concepto; }
    public Double getBaseImponible()  { return baseImponible; }
    public Double getTipoIva()        { return tipoIva; }
    public Double getTipoIrpf()       { return tipoIrpf; }
    public LocalDate getFecha()       { return fecha; }

    public void setClienteNombre(String v)  { this.clienteNombre = v; }
    public void setClienteNif(String v)     { this.clienteNif = v; }
    public void setConcepto(String v)       { this.concepto = v; }
    public void setBaseImponible(Double v)  { this.baseImponible = v; }
    public void setTipoIva(Double v)        { this.tipoIva = v; }
    public void setTipoIrpf(Double v)       { this.tipoIrpf = v; }
    public void setFecha(LocalDate v)       { this.fecha = v; }
}
