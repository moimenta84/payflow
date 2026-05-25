package com.payflow.bank.repository;

import com.payflow.bank.entity.BankTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, String> {
    boolean existsByExternalId(String externalId);
    Optional<BankTransaction> findByExternalId(String externalId);
    Optional<BankTransaction> findByIdAndUserId(String id, String userId);
    List<BankTransaction> findByUserIdOrderByBookingDateDesc(String userId);
}
