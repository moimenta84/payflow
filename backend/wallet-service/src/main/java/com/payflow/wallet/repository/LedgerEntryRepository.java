package com.payflow.wallet.repository;

import com.payflow.wallet.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, String> {
    List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(String walletId);
    Optional<LedgerEntry> findFirstByCorrelationIdAndUserId(String correlationId, String userId);
}
