package com.payflow.bank.controller;

import com.payflow.bank.dto.BankConnectionResponse;
import com.payflow.bank.dto.BankTransactionResponse;
import com.payflow.bank.service.BankService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// API REST de Open Banking: conectar el banco, ver estado, sincronizar movimientos e importarlos.
@RestController
@RequestMapping("/bank")
@Tag(name = "Open Banking", description = "Conexión de cuentas bancarias y sincronización vía Nordigen (PSD2)")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    @Operation(summary = "Listar entidades", description = "Devuelve los bancos disponibles para conectar")
    @GetMapping("/institutions")
    public ResponseEntity<List<Map<String, Object>>> getInstitutions() {
        return ResponseEntity.ok(bankService.getInstituciones());
    }

    @Operation(summary = "Conectar banco", description = "Inicia el flujo OAuth de Nordigen y devuelve la URL de autorización")
    @PostMapping("/connect")
    public ResponseEntity<BankConnectionResponse> connect(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, String> body) {
        String redirectUrl = body.getOrDefault(
            "redirectUrl", "http://localhost:5173/banco?connected=true");
        return ResponseEntity.ok(
            bankService.iniciarConexion(userId, body.get("institutionId"), redirectUrl));
    }

    @Operation(summary = "Estado de conexión", description = "Indica si el usuario tiene un banco vinculado")
    @GetMapping("/status")
    public ResponseEntity<?> status(@RequestHeader("X-User-Id") String userId) {
        return bankService.getConexion(userId)
                .map(r -> ResponseEntity.ok((Object) r))
                .orElse(ResponseEntity.noContent().build());
    }

    @Operation(summary = "Callback OAuth", description = "Recibe la redirección de Nordigen y completa la vinculación")
    @GetMapping("/callback")
    public ResponseEntity<String> callback(
            @RequestParam String ref,
            @RequestParam String userId) {
        bankService.procesarCallback(userId, ref);
        return ResponseEntity.ok("Banco vinculado. Puedes cerrar esta ventana.");
    }

    @Operation(summary = "Sincronizar transacciones", description = "Obtiene las transacciones del banco conectado")
    @GetMapping("/transactions")
    public ResponseEntity<List<BankTransactionResponse>> getTransactions(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(bankService.sincronizarTransacciones(userId));
    }

    @Operation(summary = "Importar transacción", description = "Importa una transacción bancaria al historial de PayFlow")
    @PostMapping("/transactions/{id}/import")
    public ResponseEntity<Void> importTransaction(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        bankService.importarTransaccion(userId, id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Desconectar banco", description = "Elimina la vinculación bancaria del usuario")
    @DeleteMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@RequestHeader("X-User-Id") String userId) {
        bankService.desconectar(userId);
        return ResponseEntity.noContent().build();
    }
}
