package com.payflow.wallet.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "wallets", uniqueConstraints = @UniqueConstraint(columnNames = "userId"))
public class WalletEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String userId;

    @Column(nullable = false)
    private Double balance = 0.0;

    @Column(nullable = false, length = 3)
    private String currency = "EUR";

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // ── Relación 1:N con el libro mayor (lado inverso) ──
    // Una wallet tiene muchos asientos contables (LedgerEntry).
    // FetchType.LAZY: una colección NUNCA debe ser EAGER por defecto, evita
    // cargar cientos de asientos cada vez que se lee la wallet (problema N+1).
    // Cuando hace falta el historial junto a la wallet, se pide explícitamente
    // con una consulta JOIN FETCH (ver LedgerEntryRepository).
    @OneToMany(mappedBy = "wallet", fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    private List<LedgerEntry> ledgerEntries = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public List<LedgerEntry> getLedgerEntries() { return ledgerEntries; }
    public void setLedgerEntries(List<LedgerEntry> ledgerEntries) { this.ledgerEntries = ledgerEntries; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Double getBalance() { return balance; }
    public void setBalance(Double balance) { this.balance = balance; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
