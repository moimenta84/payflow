package com.payflow.auth.controller;

import com.payflow.auth.dto.RolRequest;
import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AuthService authService;

    public AdminController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(authService.getAllUsers());
    }

    @PutMapping("/users/{id}/rol")
    public ResponseEntity<UserResponse> changeRol(
            @PathVariable String id,
            @Valid @RequestBody RolRequest request) {
        return ResponseEntity.ok(authService.changeRol(id, request));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        authService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
