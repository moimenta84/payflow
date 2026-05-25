package com.payflow.bank.repository;

import com.payflow.bank.entity.BankConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BankConnectionRepository extends JpaRepository<BankConnection, String> {
    Optional<BankConnection> findByUserIdAndRequisitionId(String userId, String requisitionId);
    Optional<BankConnection> findFirstByUserIdOrderByCreatedAtDesc(String userId);
    Optional<BankConnection> findFirstByUserIdAndStatusOrderByCreatedAtDesc(String userId, BankConnection.Status status);
}
