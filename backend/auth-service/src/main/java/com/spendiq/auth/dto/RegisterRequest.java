package com.spendiq.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(min = 2, message = "El nombre debe tener al menos 2 caracteres")
    private String nombre;

    @Size(min = 2, message = "El apellido debe tener al menos 2 caracteres")
    private String apellido;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "El email no tiene un formato válido")
    private String email;

    private String telefono;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    private String password;

    private Double saldoInicial;

    public String getNombre()         { return nombre; }
    public String getApellido()       { return apellido; }
    public String getEmail()          { return email; }
    public String getTelefono()       { return telefono; }
    public String getPassword()       { return password; }
    public Double getSaldoInicial()   { return saldoInicial; }

    public void setNombre(String nombre)               { this.nombre = nombre; }
    public void setApellido(String apellido)           { this.apellido = apellido; }
    public void setEmail(String email)                 { this.email = email; }
    public void setTelefono(String telefono)           { this.telefono = telefono; }
    public void setPassword(String password)           { this.password = password; }
    public void setSaldoInicial(Double saldoInicial)   { this.saldoInicial = saldoInicial; }
}
