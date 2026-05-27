package com.payflow.wallet.repository;

import com.payflow.wallet.entity.WalletEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WalletRepository extends JpaRepository<WalletEntity, String> {
    Optional<WalletEntity> findByUserId(String userId);
}
