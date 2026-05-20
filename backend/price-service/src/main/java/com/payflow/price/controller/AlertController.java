package com.payflow.price.controller;

import com.payflow.price.dto.AlertRequest;
import com.payflow.price.dto.AlertResponse;
import com.payflow.price.service.AlertService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    // POST /alerts
    @PostMapping
    public ResponseEntity<AlertResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Email") String userEmail,
            @Valid @RequestBody AlertRequest request) {
        return ResponseEntity.ok(alertService.create(userId, userEmail, request));
    }

    // GET /alerts
    @GetMapping
    public ResponseEntity<List<AlertResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(alertService.getAlerts(userId));
    }

    // DELETE /alerts/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        alertService.deleteAlert(userId, id);
        return ResponseEntity.noContent().build();
    }
}
