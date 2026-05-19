package com.spendiq.price.controller;

import com.spendiq.price.dto.PriceResponse;
import com.spendiq.price.service.PriceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/prices")
public class PriceController {

    private final PriceService priceService;

    public PriceController(PriceService priceService) {
        this.priceService = priceService;
    }

    // GET /prices  →  todos los activos con su precio actual
    @GetMapping
    public ResponseEntity<List<PriceResponse>> getAll() {
        return ResponseEntity.ok(priceService.getAll());
    }

    // GET /prices/bitcoin  →  precio de un activo concreto
    @GetMapping("/{asset}")
    public ResponseEntity<PriceResponse> getOne(@PathVariable String asset) {
        return ResponseEntity.ok(priceService.getByAsset(asset));
    }
}
