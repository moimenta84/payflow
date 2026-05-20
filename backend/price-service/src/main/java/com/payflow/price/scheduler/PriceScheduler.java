package com.payflow.price.scheduler;

import com.payflow.price.dto.PriceResponse;
import com.payflow.price.service.AlertService;
import com.payflow.price.service.PriceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PriceScheduler {

    private static final Logger log = LoggerFactory.getLogger(PriceScheduler.class);

    private final PriceService  priceService;
    private final AlertService  alertService;

    public PriceScheduler(PriceService priceService, AlertService alertService) {
        this.priceService = priceService;
        this.alertService = alertService;
    }

    @Scheduled(fixedDelayString = "${app.price.interval}")
    public void fetchPrices() {
        log.info("Actualizando precios desde CoinGecko...");
        try {
            priceService.fetchAndPublish();

            // Comprueba si alguna alerta pendiente se ha disparado
            List<PriceResponse> prices = priceService.getAll();
            prices.forEach(p -> alertService.checkAlerts(p.getAsset(), p.getPriceUsd()));

        } catch (Exception e) {
            log.error("Error al obtener precios de CoinGecko: {}", e.getMessage());
        }
    }
}
