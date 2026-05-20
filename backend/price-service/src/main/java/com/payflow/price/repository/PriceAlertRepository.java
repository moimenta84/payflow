package com.payflow.price.repository;

import com.payflow.price.entity.PriceAlertEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PriceAlertRepository extends JpaRepository<PriceAlertEntity, String> {

    List<PriceAlertEntity> findByUserIdOrderByCreatedAtDesc(String userId);

    // Las alertas pendientes de comprobar en cada tick del scheduler
    List<PriceAlertEntity> findByTriggeredFalseAndAsset(String asset);
}
