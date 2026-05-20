package com.payflow.trading.controller;

import com.payflow.trading.dto.AssetResponse;
import com.payflow.trading.service.AssetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/assets")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    // GET /assets  →  sin JWT (ruta pública en el gateway)
    @GetMapping
    public ResponseEntity<List<AssetResponse>> getAll() {
        return ResponseEntity.ok(assetService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssetResponse> getOne(@PathVariable String id) {
        return ResponseEntity.ok(assetService.getById(id));
    }
}
