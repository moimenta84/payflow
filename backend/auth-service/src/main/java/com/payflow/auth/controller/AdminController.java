package com.payflow.auth.controller;

import com.payflow.auth.dto.RolRequest;
import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@Tag(name = "Administración", description = "Gestión de usuarios y roles (solo administradores)")
public class AdminController {

    private final AuthService authService;

    public AdminController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "Listar usuarios", description = "Devuelve todos los usuarios registrados")
    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(authService.getAllUsers());
    }

    @Operation(summary = "Cambiar rol", description = "Modifica el rol de un usuario")
    @PutMapping("/users/{id}/rol")
    public ResponseEntity<UserResponse> changeRol(
            @PathVariable String id,
            @Valid @RequestBody RolRequest request) {
        return ResponseEntity.ok(authService.changeRol(id, request));
    }

    @Operation(summary = "Eliminar usuario", description = "Borra un usuario por su ID")
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        authService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
