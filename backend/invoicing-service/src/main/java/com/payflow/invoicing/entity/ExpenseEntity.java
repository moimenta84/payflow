package com.payflow.invoicing.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "expenses")
public class ExpenseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    private String descripcion;
    private String proveedor;

    @Column(nullable = false)
    private Double baseImponible;

    private Double cuotaIva;
    private Double total;
    private LocalDate fecha;

    @Enumerated(EnumType.STRING)
    private Categoria categoria = Categoria.OTROS;

    private boolean deducible = true;

    public enum Categoria { MATERIAL, SERVICIOS, SUMINISTROS, OTROS }

    public String getId()             { return id; }
    public String getUserId()         { return userId; }
    public String getDescripcion()    { return descripcion; }
    public String getProveedor()      { return proveedor; }
    public Double getBaseImponible()  { return baseImponible; }
    public Double getCuotaIva()       { return cuotaIva; }
    public Double getTotal()          { return total; }
    public LocalDate getFecha()       { return fecha; }
    public Categoria getCategoria()   { return categoria; }
    public boolean isDeducible()      { return deducible; }

    public void setUserId(String v)         { this.userId = v; }
    public void setDescripcion(String v)    { this.descripcion = v; }
    public void setProveedor(String v)      { this.proveedor = v; }
    public void setBaseImponible(Double v)  { this.baseImponible = v; }
    public void setCuotaIva(Double v)       { this.cuotaIva = v; }
    public void setTotal(Double v)          { this.total = v; }
    public void setFecha(LocalDate v)       { this.fecha = v; }
    public void setCategoria(Categoria v)   { this.categoria = v; }
    public void setDeducible(boolean v)     { this.deducible = v; }
}
