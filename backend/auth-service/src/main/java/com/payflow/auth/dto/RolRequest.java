package com.payflow.auth.dto;

import com.payflow.auth.entity.UserEntity;
import jakarta.validation.constraints.NotNull;

public class RolRequest {

    @NotNull(message = "El rol es obligatorio (USER o ADMIN)")
    private UserEntity.Rol rol;

    public UserEntity.Rol getRol() { return rol; }
    public void setRol(UserEntity.Rol rol) { this.rol = rol; }
}
