package com.payflow.invoicing.controller;

import com.payflow.invoicing.dto.ExpenseRequest;
import com.payflow.invoicing.dto.ExpenseResponse;
import com.payflow.invoicing.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/expenses")
public class ExpenseController {

    private final InvoiceService invoiceService;

    public ExpenseController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(invoiceService.createExpense(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(invoiceService.getExpenses(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        invoiceService.deleteExpense(userId, id);
        return ResponseEntity.noContent().build();
    }
}
