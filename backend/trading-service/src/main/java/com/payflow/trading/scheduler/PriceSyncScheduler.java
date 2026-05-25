package com.payflow.trading.scheduler;

import com.payflow.trading.entity.AssetEntity;
import com.payflow.trading.repository.AssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class PriceSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(PriceSyncScheduler.class);

    private final AssetRepository assetRepository;
    private final RestTemplate    restTemplate;

    @Value("${price.service.url:http://localhost:8084}")
    private String priceServiceUrl;

    public PriceSyncScheduler(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
        this.restTemplate    = new RestTemplate();
    }

    @Scheduled(fixedDelay = 30000, initialDelay = 5000)
    public void syncPrices() {
        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    priceServiceUrl + "/prices",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> prices = response.getBody();
            if (prices == null) return;

            prices.forEach(p -> {
                String asset    = (String) p.get("asset");
                Double priceUsd = ((Number) p.get("priceUsd")).doubleValue();

                AssetEntity entity = assetRepository.findById(asset)
                        .orElse(new AssetEntity(asset, 0.0, LocalDateTime.now()));

                entity.setPriceUsd(priceUsd);
                entity.setUpdatedAt(LocalDateTime.now());
                assetRepository.save(entity);
            });

            log.info("Precios sincronizados desde price-service: {} activos", prices.size());
        } catch (Exception e) {
            log.warn("No se pudo sincronizar precios desde price-service: {}", e.getMessage());
        }
    }
}
