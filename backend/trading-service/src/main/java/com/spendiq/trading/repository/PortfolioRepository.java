package com.spendiq.trading.repository;

import com.spendiq.trading.entity.PortfolioEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortfolioRepository extends JpaRepository<PortfolioEntry, String> {
    List<PortfolioEntry>     findByUserId(String userId);
    Optional<PortfolioEntry> findByUserIdAndAsset(String userId, String asset);
}
