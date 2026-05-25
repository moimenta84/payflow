package com.payflow.invoicing.controller;

import com.payflow.invoicing.dto.*;
import com.payflow.invoicing.service.InvoiceService;
import com.payflow.invoicing.service.InvoicePdfService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/invoices")
public class InvoiceController {

    private final InvoiceService    invoiceService;
    private final InvoicePdfService pdfService;

    public InvoiceController(InvoiceService invoiceService, InvoicePdfService pdfService) {
        this.invoiceService = invoiceService;
        this.pdfService     = pdfService;
    }

    @PostMapping
    public ResponseEntity<InvoiceResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody InvoiceRequest request) {
        return ResponseEntity.ok(invoiceService.create(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<InvoiceResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(invoiceService.getAll(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getOne(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        return ResponseEntity.ok(invoiceService.getOne(userId, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        invoiceService.cancel(userId, id);
        return ResponseEntity.noContent().build();
    }

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

    @GetMapping("/summary/quarterly")
    public ResponseEntity<QuarterlySummaryResponse> quarterly(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam int year,
            @RequestParam int quarter) {
        return ResponseEntity.ok(invoiceService.getQuarterlySummary(userId, year, quarter));
    }
}
