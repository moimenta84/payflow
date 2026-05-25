package com.payflow.bank.controller;

import com.payflow.bank.dto.BankConnectionResponse;
import com.payflow.bank.dto.BankTransactionResponse;
import com.payflow.bank.service.BankService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/bank")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    @GetMapping("/institutions")
    public ResponseEntity<List<Map<String, Object>>> getInstitutions() {
        return ResponseEntity.ok(bankService.getInstituciones());
    }

    @PostMapping("/connect")
    public ResponseEntity<BankConnectionResponse> connect(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, String> body) {
        String redirectUrl = body.getOrDefault(
            "redirectUrl", "http://localhost:5173/banco?connected=true");
        return ResponseEntity.ok(
            bankService.iniciarConexion(userId, body.get("institutionId"), redirectUrl));
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(@RequestHeader("X-User-Id") String userId) {
        return bankService.getConexion(userId)
                .map(r -> ResponseEntity.ok((Object) r))
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/callback")
    public ResponseEntity<String> callback(
            @RequestParam String ref,
            @RequestParam String userId) {
        bankService.procesarCallback(userId, ref);
        return ResponseEntity.ok("Banco vinculado. Puedes cerrar esta ventana.");
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<BankTransactionResponse>> getTransactions(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(bankService.sincronizarTransacciones(userId));
    }

    @PostMapping("/transactions/{id}/import")
    public ResponseEntity<Void> importTransaction(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        bankService.importarTransaccion(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@RequestHeader("X-User-Id") String userId) {
        bankService.desconectar(userId);
        return ResponseEntity.noContent().build();
    }
}
