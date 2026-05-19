package com.spendiq.price.client;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class CoinGeckoClient {

    private final WebClient webClient;

    public CoinGeckoClient(WebClient webClient) {
        this.webClient = webClient;
    }

    // Devuelve { "bitcoin" -> 65000.0, "ethereum" -> 3200.0, ... }
    public Map<String, Double> fetchPrices(List<String> assets) {
        String ids = String.join(",", assets);

        Map<String, Map<String, Double>> raw = webClient.get()
                .uri("/simple/price?ids={ids}&vs_currencies=usd", ids)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Map<String, Double>>>() {})
                .block();

        return raw.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().get("usd")));
    }
}
