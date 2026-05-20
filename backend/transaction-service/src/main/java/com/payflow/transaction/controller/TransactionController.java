package com.payflow.transaction.controller;

import com.payflow.transaction.dto.SummaryResponse;
import com.payflow.transaction.dto.TransactionRequest;
import com.payflow.transaction.dto.TransactionResponse;
import com.payflow.transaction.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    // ─────────────────────────────────────────────────────────
    // POST /transactions
    // El gateway añade X-User-Id tras validar el JWT
    // ─────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(transactionService.create(userId, request));
    }

    // ─────────────────────────────────────────────────────────
    // GET /transactions
    // ─────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(transactionService.getAll(userId));
    }

    // ─────────────────────────────────────────────────────────
    // GET /transactions/summary
    // ─────────────────────────────────────────────────────────
    @GetMapping("/summary")
    public ResponseEntity<SummaryResponse> getSummary(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(transactionService.getSummary(userId));
    }

    // ─────────────────────────────────────────────────────────
    // DELETE /transactions/{id}
    // ─────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id,
            @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(transactionService.update(userId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        transactionService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
