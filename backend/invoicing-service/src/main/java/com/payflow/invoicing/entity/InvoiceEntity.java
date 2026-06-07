package com.payflow.invoicing.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

// Entidad JPA: una factura emitida por el autónomo (base, IVA, IRPF, total y estado). Tabla "invoices".
@Entity
@Table(name = "invoices")
public class InvoiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    private String numeroFactura;
    private String clienteNombre;
    private String clienteNif;
    private String concepto;

    @Column(nullable = false)
    private Double baseImponible;

    private Double tipoIva    = 21.0;
    private Double cuotaIva;
    private Double tipoIrpf   = 15.0;
    private Double cuotaIrpf;
    private Double total;
    private LocalDate fecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Estado estado = Estado.PENDIENTE;

    public enum Estado { PENDIENTE, COBRADA, CANCELADA }

    public String getId()             { return id; }
    public String getUserId()         { return userId; }
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
    public Estado getEstado()         { return estado; }

    public void setUserId(String v)          { this.userId = v; }
    public void setNumeroFactura(String v)   { this.numeroFactura = v; }
    public void setClienteNombre(String v)   { this.clienteNombre = v; }
    public void setClienteNif(String v)      { this.clienteNif = v; }
    public void setConcepto(String v)        { this.concepto = v; }
    public void setBaseImponible(Double v)   { this.baseImponible = v; }
    public void setTipoIva(Double v)         { this.tipoIva = v; }
    public void setCuotaIva(Double v)        { this.cuotaIva = v; }
    public void setTipoIrpf(Double v)        { this.tipoIrpf = v; }
    public void setCuotaIrpf(Double v)       { this.cuotaIrpf = v; }
    public void setTotal(Double v)           { this.total = v; }
    public void setFecha(LocalDate v)        { this.fecha = v; }
    public void setEstado(Estado v)          { this.estado = v; }
}
