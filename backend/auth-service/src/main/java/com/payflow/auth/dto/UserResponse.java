package com.payflow.auth.dto;

import com.payflow.auth.entity.UserEntity;

public class UserResponse {

    private String id;
    private String email;
    private String fullName;
    private String iniciales;
    private Double saldoInicial;
    private String rol;

    public UserResponse(UserEntity user) {
        this.id           = user.getId();
        this.email        = user.getEmail();
        this.fullName     = user.getNombre() + (user.getApellido() != null ? " " + user.getApellido() : "");
        this.iniciales    = String.valueOf(user.getNombre().charAt(0)).toUpperCase()
                          + (user.getApellido() != null ? String.valueOf(user.getApellido().charAt(0)).toUpperCase() : "");
        this.saldoInicial = user.getSaldoInicial();
        this.rol          = user.getRol().name();
    }

    public String getId()           { return id; }
    public String getEmail()        { return email; }
    public String getFullName()     { return fullName; }
    public String getIniciales()    { return iniciales; }
    public Double getSaldoInicial() { return saldoInicial; }
    public String getRol()          { return rol; }
}
