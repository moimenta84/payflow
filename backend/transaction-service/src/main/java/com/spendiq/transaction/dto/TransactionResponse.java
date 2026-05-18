package com.spendiq.transaction.dto;

import com.spendiq.transaction.entity.TransactionEntity;
import java.time.LocalDate;

public class TransactionResponse {

    private String id;
    private String userId;
    private String tipo;
    private String categoria;
    private String descripcion;
    private Double cantidad;
    private LocalDate fecha;

    public TransactionResponse(TransactionEntity t) {
        this.id          = t.getId();
        this.userId      = t.getUserId();
        this.tipo        = t.getTipo().name();
        this.categoria   = t.getCategoria().name();
        this.descripcion = t.getDescripcion();
        this.cantidad    = t.getCantidad();
        this.fecha       = t.getFecha();
    }

    // ─── Getters ──────────────────────────────────────────────

    public String getId()          { return id; }
    public String getUserId()      { return userId; }
    public String getTipo()        { return tipo; }
    public String getCategoria()   { return categoria; }
    public String getDescripcion() { return descripcion; }
    public Double getCantidad()    { return cantidad; }
    public LocalDate getFecha()    { return fecha; }
}
