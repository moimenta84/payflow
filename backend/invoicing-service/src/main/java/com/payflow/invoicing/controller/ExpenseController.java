package com.payflow.invoicing.controller;

import com.payflow.invoicing.dto.ExpenseRequest;
import com.payflow.invoicing.dto.ExpenseResponse;
import com.payflow.invoicing.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/expenses")
@Tag(name = "Gastos", description = "Registro de gastos deducibles del autónomo")
public class ExpenseController {

    private final InvoiceService invoiceService;

    public ExpenseController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @Operation(summary = "Registrar gasto", description = "Añade un gasto deducible")
    @PostMapping
    public ResponseEntity<ExpenseResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(invoiceService.createExpense(userId, request));
    }

    @Operation(summary = "Listar gastos", description = "Devuelve todos los gastos del usuario")
    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(invoiceService.getExpenses(userId));
    }

    @Operation(summary = "Eliminar gasto", description = "Borra un gasto por su ID")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        invoiceService.deleteExpense(userId, id);
        return ResponseEntity.noContent().build();
    }
}
