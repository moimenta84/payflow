package com.payflow.wallet.repository;

import com.payflow.wallet.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, String> {
    List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(String walletId);
    Optional<LedgerEntry> findFirstByCorrelationIdAndUserId(String correlationId, String userId);

    // EAGER LOADING explícito vía JOIN FETCH: trae cada asiento junto con su
    // wallet en una sola consulta SQL, evitando el problema N+1 que tendríamos
    // al recorrer le.getWallet() asiento por asiento. Esto es "eager loading
    // cuando es necesario": solo en la consulta que de verdad necesita la wallet.
    @Query("SELECT le FROM LedgerEntry le JOIN FETCH le.wallet " +
           "WHERE le.userId = :userId ORDER BY le.createdAt DESC")
    List<LedgerEntry> findByUserIdWithWallet(@Param("userId") String userId);
}
