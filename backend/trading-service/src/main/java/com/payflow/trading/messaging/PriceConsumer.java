package com.payflow.trading.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payflow.trading.entity.AssetEntity;
import com.payflow.trading.repository.AssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component
public class PriceConsumer {

    private static final Logger log = LoggerFactory.getLogger(PriceConsumer.class);

    private final AssetRepository assetRepository;
    private final ObjectMapper    objectMapper;

    public PriceConsumer(AssetRepository assetRepository, ObjectMapper objectMapper) {
        this.assetRepository = assetRepository;
        this.objectMapper    = objectMapper;
    }

    @JmsListener(destination = "PRICE.UPDATED")
    public void onPriceUpdated(String message) {
        try {
            // PriceResponse: { asset, priceUsd, updatedAt }
            Map<String, Object> payload = objectMapper.readValue(message, Map.class);
            String asset    = (String) payload.get("asset");
            Double priceUsd = ((Number) payload.get("priceUsd")).doubleValue();

            AssetEntity entity = assetRepository.findById(asset)
                    .orElse(new AssetEntity(asset, priceUsd, LocalDateTime.now()));

            entity.setPriceUsd(priceUsd);
            entity.setUpdatedAt(LocalDateTime.now());
            assetRepository.save(entity);

            log.info("Precio actualizado: {} = {} USD", asset, priceUsd);
        } catch (Exception e) {
            log.error("Error procesando PRICE.UPDATED: {}", e.getMessage());
        }
    }
}
