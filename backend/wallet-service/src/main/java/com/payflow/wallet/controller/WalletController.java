package com.payflow.wallet.controller;

import com.payflow.wallet.dto.LedgerEntryResponse;
import com.payflow.wallet.dto.SendMoneyRequest;
import com.payflow.wallet.dto.WalletResponse;
import com.payflow.wallet.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST del wallet-service.
 *
 * Todos los endpoints requieren autenticación JWT. El API Gateway inyecta
 * el header "X-User-Id" con el ID del usuario autenticado tras validar el token,
 * por lo que este servicio no necesita Spring Security propio.
 *
 * Base URL: /wallet  (enrutado por el API Gateway → lb://wallet-service)
 */
@RestController
@RequestMapping("/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /**
     * GET /wallet/me
     * Devuelve el saldo y datos de la wallet del usuario autenticado.
     * Si el usuario no tiene wallet, la crea con saldo de bienvenida (50 EUR).
     */
    @GetMapping("/me")
    public ResponseEntity<WalletResponse> getMyWallet(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(walletService.getOrCreateWallet(userId));
    }

    /**
     * GET /wallet/movements
     * Devuelve el historial de movimientos (ledger) del usuario, del más reciente al más antiguo.
     * Cada entrada incluye tipo (CREDIT/DEBIT), importe, concepto y saldo resultante.
     */
    @GetMapping("/movements")
    public ResponseEntity<List<LedgerEntryResponse>> getMovements(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(walletService.getMovements(userId));
    }

    /**
     * POST /wallet/send
     * Transfiere dinero a otro usuario PayFlow (P2P).
     *
     * Soporta idempotencia mediante el header "Idempotency-Key": si se recibe
     * la misma clave en una segunda petición, la operación no se repite.
     *
     * Body: { toUserId, amount, description? }
     * Devuelve la wallet actualizada del remitente.
     */
    @PostMapping("/send")
    public ResponseEntity<WalletResponse> send(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody SendMoneyRequest req) {
        return ResponseEntity.ok(walletService.send(userId, req, idempotencyKey));
    }
}
