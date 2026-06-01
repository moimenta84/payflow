package com.payflow.wallet.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ledger_entries", indexes = {
        @Index(name = "idx_ledger_wallet", columnList = "walletId"),
        @Index(name = "idx_ledger_correlation", columnList = "correlationId")
})
public class LedgerEntry {

    public enum Type { DEBIT, CREDIT }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String walletId;

    // ── Relación N:1 con la wallet (lado propietario de la navegación) ──
    // EAGER LOADING justificado: un asiento contable no tiene sentido sin su
    // wallet, así que al cargar un LedgerEntry traemos también su wallet de una
    // sola vez. Se mapea sobre la MISMA columna 'walletId' en modo solo lectura
    // (insertable/updatable = false): la escritura la sigue gestionando el campo
    // String walletId de arriba, por lo que la lógica de servicio no cambia.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "walletId", insertable = false, updatable = false)
    private WalletEntity wallet;

    @Column(nullable = false)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Type type;

    @Column(nullable = false)
    private Double amount;

    @Column(nullable = false)
    private Double balanceAfter;

    @Column(nullable = false)
    private String correlationId;

    @Column(length = 200)
    private String description;

    @Column
    private String counterpartyUserId;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWalletId() { return walletId; }
    public void setWalletId(String walletId) { this.walletId = walletId; }

    public WalletEntity getWallet() { return wallet; }
    public void setWallet(WalletEntity wallet) { this.wallet = wallet; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public Double getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(Double balanceAfter) { this.balanceAfter = balanceAfter; }

    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCounterpartyUserId() { return counterpartyUserId; }
    public void setCounterpartyUserId(String counterpartyUserId) { this.counterpartyUserId = counterpartyUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
