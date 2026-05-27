package com.payflow.bank.dto;

public class InstitutionResponse {
    private String id;
    private String name;
    private String logo;

    public InstitutionResponse() {}

    public InstitutionResponse(String id, String name, String logo) {
        this.id = id;
        this.name = name;
        this.logo = logo;
    }

    public String getId()   { return id; }
    public String getName() { return name; }
    public String getLogo() { return logo; }

    public void setId(String id)       { this.id = id; }
    public void setName(String name)   { this.name = name; }
    public void setLogo(String logo)   { this.logo = logo; }
}
