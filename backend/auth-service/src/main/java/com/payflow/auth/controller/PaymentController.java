package com.payflow.auth.controller;

import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.service.StripeOperations;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Endpoints de pago con Stripe. Rutas protegidas: el gateway valida el JWT
// e inyecta el header X-User-Id, igual que en /auth/me.
@RestController
@RequestMapping("/payments")
@Tag(name = "Pagos", description = "Checkout y activación de planes de suscripción vía Stripe")
public class PaymentController {

    private final StripeOperations stripeService;

    public PaymentController(StripeOperations stripeService) {
        this.stripeService = stripeService;
    }

    // POST /payments/create-checkout-session
    // Crea la sesión de Stripe Checkout y devuelve la URL hosted
    @Operation(summary = "Crear sesión de checkout", description = "Devuelve la URL de Stripe Checkout para el plan elegido")
    @PostMapping("/create-checkout-session")
    public ResponseEntity<Map<String, String>> createCheckoutSession(
            @Parameter(in = ParameterIn.HEADER, description = "ID de usuario inyectado por el gateway")
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, String> body) {
        String url = stripeService.createCheckoutSession(userId, body.get("plan"));
        return ResponseEntity.ok(Map.of("url", url));
    }

    // POST /payments/confirm
    // Verifica la sesión al volver de Stripe y activa el plan del usuario
    @Operation(summary = "Confirmar pago", description = "Verifica la sesión de Stripe y activa el plan del usuario")
    @PostMapping("/confirm")
    public ResponseEntity<UserResponse> confirm(
            @Parameter(in = ParameterIn.HEADER, description = "ID de usuario inyectado por el gateway")
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(stripeService.confirmSession(userId, body.get("sessionId")));
    }
}
