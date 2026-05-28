package com.payflow.auth.dto;

import com.payflow.auth.entity.UserEntity;

public class UserResponse {

    private String id;
    private String email;
    private String nombre;
    private String apellido;
    private String fullName;
    private String iniciales;
    private Double saldoInicial;
    private String rol;
    private String plan;

    public UserResponse(UserEntity user) {
        this.id           = user.getId();
        this.email        = user.getEmail();
        this.nombre       = user.getNombre();
        this.apellido     = user.getApellido();
        this.fullName     = user.getNombre() + (user.getApellido() != null ? " " + user.getApellido() : "");
        this.iniciales    = String.valueOf(user.getNombre().charAt(0)).toUpperCase()
                          + (user.getApellido() != null ? String.valueOf(user.getApellido().charAt(0)).toUpperCase() : "");
        this.saldoInicial = user.getSaldoInicial();
        this.rol          = user.getRol().name();
        // Los usuarios creados antes de existir la columna tienen plan NULL en BD
        this.plan         = user.getPlan() != null ? user.getPlan().name() : "FREE";
    }

    public String getId()           { return id; }
    public String getEmail()        { return email; }
    public String getNombre()       { return nombre; }
    public String getApellido()     { return apellido; }
    public String getFullName()     { return fullName; }
    public String getIniciales()    { return iniciales; }
    public Double getSaldoInicial() { return saldoInicial; }
    public String getRol()          { return rol; }
    public String getPlan()         { return plan; }
}
