package com.spendiq.trading.controller;

import com.spendiq.trading.dto.PortfolioResponse;
import com.spendiq.trading.service.TradingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/portfolio")
public class PortfolioController {

    private final TradingService tradingService;

    public PortfolioController(TradingService tradingService) {
        this.tradingService = tradingService;
    }

    // GET /portfolio  →  cartera del usuario con valoración actual
    @GetMapping
    public ResponseEntity<List<PortfolioResponse>> getPortfolio(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(tradingService.getPortfolio(userId));
    }
}
