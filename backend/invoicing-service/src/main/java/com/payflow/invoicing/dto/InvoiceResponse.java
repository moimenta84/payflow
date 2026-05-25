package com.payflow.invoicing.dto;

import com.payflow.invoicing.entity.InvoiceEntity;
import java.time.LocalDate;

public class InvoiceResponse {
    private String id;
    private String numeroFactura;
    private String clienteNombre;
    private String clienteNif;
    private String concepto;
    private Double baseImponible;
    private Double tipoIva;
    private Double cuotaIva;
    private Double tipoIrpf;
    private Double cuotaIrpf;
    private Double total;
    private LocalDate fecha;
    private String estado;

    public InvoiceResponse(InvoiceEntity e) {
        this.id             = e.getId();
        this.numeroFactura  = e.getNumeroFactura();
        this.clienteNombre  = e.getClienteNombre();
        this.clienteNif     = e.getClienteNif();
        this.concepto       = e.getConcepto();
        this.baseImponible  = e.getBaseImponible();
        this.tipoIva        = e.getTipoIva();
        this.cuotaIva       = e.getCuotaIva();
        this.tipoIrpf       = e.getTipoIrpf();
        this.cuotaIrpf      = e.getCuotaIrpf();
        this.total          = e.getTotal();
        this.fecha          = e.getFecha();
        this.estado         = e.getEstado().name();
    }

    public String getId()             { return id; }
    public String getNumeroFactura()  { return numeroFactura; }
    public String getClienteNombre()  { return clienteNombre; }
    public String getClienteNif()     { return clienteNif; }
    public String getConcepto()       { return concepto; }
    public Double getBaseImponible()  { return baseImponible; }
    public Double getTipoIva()        { return tipoIva; }
    public Double getCuotaIva()       { return cuotaIva; }
    public Double getTipoIrpf()       { return tipoIrpf; }
    public Double getCuotaIrpf()      { return cuotaIrpf; }
    public Double getTotal()          { return total; }
    public LocalDate getFecha()       { return fecha; }
    public String getEstado()         { return estado; }
}
