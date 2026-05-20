package com.payflow.trading.controller;

import com.payflow.trading.dto.OrderRequest;
import com.payflow.trading.dto.OrderResponse;
import com.payflow.trading.service.TradingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final TradingService tradingService;

    public OrderController(TradingService tradingService) {
        this.tradingService = tradingService;
    }

    // POST /orders  →  JWT requerido, X-User-Id inyectado por el gateway
    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody OrderRequest request) {
        return ResponseEntity.ok(tradingService.createOrder(userId, request));
    }

    // GET /orders  →  historial de órdenes del usuario
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getAll(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(tradingService.getOrders(userId));
    }
}
