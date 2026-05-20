package com.payflow.price.scheduler;

import com.payflow.price.service.PriceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PriceScheduler {

    private static final Logger log = LoggerFactory.getLogger(PriceScheduler.class);

    private final PriceService priceService;

    public PriceScheduler(PriceService priceService) {
        this.priceService = priceService;
    }

    @Scheduled(fixedDelayString = "${app.price.interval}")
    public void fetchPrices() {
        log.info("Actualizando precios desde CoinGecko...");
        try {
            priceService.fetchAndPublish();
        } catch (Exception e) {
            log.error("Error al obtener precios de CoinGecko: {}", e.getMessage());
        }
    }
}
