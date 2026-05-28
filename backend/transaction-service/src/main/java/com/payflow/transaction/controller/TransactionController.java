package com.payflow.transaction.controller;

import com.payflow.transaction.dto.SummaryResponse;
import com.payflow.transaction.dto.TransactionRequest;
import com.payflow.transaction.dto.TransactionResponse;
import com.payflow.transaction.service.PdfReportService;
import com.payflow.transaction.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/transactions")
@Tag(name = "Transacciones", description = "CRUD de movimientos, resúmenes e informes PDF")
public class TransactionController {

    private final TransactionService transactionService;
    private final PdfReportService   pdfReportService;

    public TransactionController(TransactionService transactionService,
                                 PdfReportService pdfReportService) {
        this.transactionService = transactionService;
        this.pdfReportService   = pdfReportService;
    }

    @Operation(summary = "Crear transacción", description = "Registra un gasto o ingreso del usuario")
    @PostMapping
    public ResponseEntity<TransactionResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(transactionService.create(userId, request));
    }

    @Operation(summary = "Listar transacciones", description = "Devuelve todas las transacciones del usuario")
    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(transactionService.getAll(userId));
    }

    @Operation(summary = "Resumen financiero", description = "Totales de gastos, ingresos y balance")
    @GetMapping("/summary")
    public ResponseEntity<SummaryResponse> getSummary(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(transactionService.getSummary(userId));
    }

    @Operation(summary = "Informe PDF mensual", description = "Genera un PDF con las transacciones del mes indicado")
    // GET /transactions/report/pdf?year=2025&month=5
    @GetMapping("/report/pdf")
    public ResponseEntity<byte[]> downloadPdf(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {

        LocalDate now = LocalDate.now();
        int y = year  > 0 ? year  : now.getYear();
        int m = month > 0 ? month : now.getMonthValue();

        byte[] pdf = pdfReportService.generateMonthlyReport(userId, y, m);

        String filename = String.format("payflow-informe-%d-%02d.pdf", y, m);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(pdf);
    }

    @Operation(summary = "Actualizar transacción", description = "Edita una transacción existente del usuario")
    @PutMapping("/{id}")
    public ResponseEntity<TransactionResponse> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id,
            @RequestBody TransactionRequest request) {
        return ResponseEntity.ok(transactionService.update(userId, id, request));
    }

    @Operation(summary = "Eliminar transacción", description = "Borra una transacción por su ID")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        transactionService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
