package com.payflow.invoicing.controller;

import com.payflow.invoicing.dto.*;
import com.payflow.invoicing.service.InvoiceService;
import com.payflow.invoicing.service.InvoicePdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/invoices")
@Tag(name = "Facturas", description = "Emisión, consulta, PDF y resúmenes trimestrales de facturas")
public class InvoiceController {

    private final InvoiceService    invoiceService;
    private final InvoicePdfService pdfService;

    public InvoiceController(InvoiceService invoiceService, InvoicePdfService pdfService) {
        this.invoiceService = invoiceService;
        this.pdfService     = pdfService;
    }

    @Operation(summary = "Crear factura", description = "Emite una nueva factura para el autónomo")
    @PostMapping
    public ResponseEntity<InvoiceResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.ok(invoiceService.create(userId, request));
    }

    @Operation(summary = "Listar facturas", description = "Devuelve todas las facturas del usuario")
    @GetMapping
    public ResponseEntity<List<InvoiceResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(invoiceService.getAll(userId));
    }

    @Operation(summary = "Obtener factura", description = "Devuelve una factura por su ID")
    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getOne(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        return ResponseEntity.ok(invoiceService.getOne(userId, id));
    }

    @Operation(summary = "Anular factura", description = "Cancela una factura por su ID")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        invoiceService.cancel(userId, id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Descargar factura PDF", description = "Genera el PDF de una factura")
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        byte[] pdf  = pdfService.generate(userId, id);
        String name = "factura-" + id + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"")
                .body(pdf);
    }

    @Operation(summary = "Resumen trimestral", description = "Totales de facturación de un trimestre (modelo 130/303)")
    @GetMapping("/summary/quarterly")
    public ResponseEntity<QuarterlySummaryResponse> quarterly(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam int year,
            @RequestParam int quarter) {
        return ResponseEntity.ok(invoiceService.getQuarterlySummary(userId, year, quarter));
    }
}
