package com.spendiq.price.service;

import com.spendiq.price.client.CoinGeckoClient;
import com.spendiq.price.dto.PriceResponse;
import com.spendiq.price.messaging.PricePublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PriceService {

    private final ConcurrentHashMap<String, PriceResponse> cache = new ConcurrentHashMap<>();

    private final CoinGeckoClient coinGeckoClient;
    private final PricePublisher  pricePublisher;

    @Value("${app.assets}")
    private List<String> assets;

    public PriceService(CoinGeckoClient coinGeckoClient, PricePublisher pricePublisher) {
        this.coinGeckoClient = coinGeckoClient;
        this.pricePublisher  = pricePublisher;
    }

    // Llamado por el scheduler cada 30s
    public void fetchAndPublish() {
        Map<String, Double> prices = coinGeckoClient.fetchPrices(assets);

        prices.forEach((asset, price) -> {
            PriceResponse response = new PriceResponse(asset, price, LocalDateTime.now());
            cache.put(asset, response);
            pricePublisher.publish(response);
        });
    }

    public List<PriceResponse> getAll() {
        return new ArrayList<>(cache.values());
    }

    public PriceResponse getByAsset(String asset) {
        PriceResponse price = cache.get(asset.toLowerCase());
        if (price == null) throw new RuntimeException("Asset no encontrado: " + asset);
        return price;
    }
}
