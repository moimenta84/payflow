package com.payflow.bank.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Entidad JPA: la vinculación de un usuario con su banco (estado PENDING/LINKED/EXPIRED). Tabla "bank_connections".
@Entity
@Table(name = "bank_connections")
public class BankConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String userId;

    private String requisitionId;
    private String institutionId;
    private String institutionName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @Column(length = 1024)
    private String link;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status { PENDING, LINKED, EXPIRED }

    public String getId()                  { return id; }
    public String getUserId()              { return userId; }
    public String getRequisitionId()       { return requisitionId; }
    public String getInstitutionId()       { return institutionId; }
    public String getInstitutionName()     { return institutionName; }
    public Status getStatus()              { return status; }
    public String getLink()                { return link; }
    public LocalDateTime getCreatedAt()    { return createdAt; }

    public void setUserId(String v)         { this.userId = v; }
    public void setRequisitionId(String v)  { this.requisitionId = v; }
    public void setInstitutionId(String v)  { this.institutionId = v; }
    public void setInstitutionName(String v){ this.institutionName = v; }
    public void setStatus(Status v)         { this.status = v; }
    public void setLink(String v)           { this.link = v; }
}
