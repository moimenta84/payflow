package com.payflow.bank.dto;

import com.payflow.bank.entity.BankConnection;
import java.time.LocalDateTime;

public class BankConnectionResponse {
    private String id;
    private String requisitionId;
    private String institutionName;
    private String status;
    private String link;
    private LocalDateTime createdAt;

    public BankConnectionResponse(BankConnection c) {
        this.id              = c.getId();
        this.requisitionId   = c.getRequisitionId();
        this.institutionName = c.getInstitutionName();
        this.status          = c.getStatus().name();
        this.link            = c.getLink();
        this.createdAt       = c.getCreatedAt();
    }

    public String getId()              { return id; }
    public String getRequisitionId()   { return requisitionId; }
    public String getInstitutionName() { return institutionName; }
    public String getStatus()          { return status; }
    public String getLink()            { return link; }
    public LocalDateTime getCreatedAt(){ return createdAt; }
}
