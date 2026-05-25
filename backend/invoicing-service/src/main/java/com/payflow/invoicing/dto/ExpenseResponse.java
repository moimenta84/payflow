package com.payflow.invoicing.dto;

import com.payflow.invoicing.entity.ExpenseEntity;
import java.time.LocalDate;

public class ExpenseResponse {
    private String id;
    private String descripcion;
    private String proveedor;
    private Double baseImponible;
    private Double cuotaIva;
    private Double total;
    private LocalDate fecha;
    private String categoria;
    private boolean deducible;

    public ExpenseResponse(ExpenseEntity e) {
        this.id            = e.getId();
        this.descripcion   = e.getDescripcion();
        this.proveedor     = e.getProveedor();
        this.baseImponible = e.getBaseImponible();
        this.cuotaIva      = e.getCuotaIva();
        this.total         = e.getTotal();
        this.fecha         = e.getFecha();
        this.categoria     = e.getCategoria().name();
        this.deducible     = e.isDeducible();
    }

    public String getId()            { return id; }
    public String getDescripcion()   { return descripcion; }
    public String getProveedor()     { return proveedor; }
    public Double getBaseImponible() { return baseImponible; }
    public Double getCuotaIva()      { return cuotaIva; }
    public Double getTotal()         { return total; }
    public LocalDate getFecha()      { return fecha; }
    public String getCategoria()     { return categoria; }
    public boolean isDeducible()     { return deducible; }
}
