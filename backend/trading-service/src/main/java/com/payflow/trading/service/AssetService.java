package com.payflow.trading.service;

import com.payflow.trading.dto.AssetResponse;
import com.payflow.trading.entity.AssetEntity;
import com.payflow.trading.repository.AssetRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AssetService {

    private final AssetRepository assetRepository;

    @Value("${app.assets}")
    private List<String> assets;

    public AssetService(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    // Inicializa los activos con precio 0 si aún no han llegado datos de price-service
    @PostConstruct
    public void seedAssets() {
        assets.forEach(id -> {
            if (!assetRepository.existsById(id)) {
                assetRepository.save(new AssetEntity(id, 0.0, LocalDateTime.now()));
            }
        });
    }

    public List<AssetResponse> getAll() {
        return assetRepository.findAll().stream()
                .map(AssetResponse::new)
                .toList();
    }

    public AssetResponse getById(String id) {
        return assetRepository.findById(id)
                .map(AssetResponse::new)
                .orElseThrow(() -> new RuntimeException("Asset no encontrado: " + id));
    }
}
