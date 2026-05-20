package com.spendiq.trading.repository;

import com.spendiq.trading.entity.AssetEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetRepository extends JpaRepository<AssetEntity, String> {}
