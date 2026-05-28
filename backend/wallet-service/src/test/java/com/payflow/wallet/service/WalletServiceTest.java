package com.payflow.wallet.service;

import com.payflow.wallet.dto.SendMoneyRequest;
import com.payflow.wallet.dto.WalletResponse;
import com.payflow.wallet.entity.LedgerEntry;
import com.payflow.wallet.entity.WalletEntity;
import com.payflow.wallet.repository.LedgerEntryRepository;
import com.payflow.wallet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private LedgerEntryRepository ledgerRepository;

    @InjectMocks
    private WalletService walletService;

    private WalletEntity walletAlice;
    private WalletEntity walletBob;

    @BeforeEach
    void setUp() {
        walletAlice = new WalletEntity();
        walletAlice.setId("wallet-alice");
        walletAlice.setUserId("alice");
        walletAlice.setBalance(100.0);
        walletAlice.setCurrency("EUR");

        walletBob = new WalletEntity();
        walletBob.setId("wallet-bob");
        walletBob.setUserId("bob");
        walletBob.setBalance(50.0);
        walletBob.setCurrency("EUR");
    }

    // ─── getOrCreateWallet ───────────────────────────────────────────────

    @Test
    void getOrCreateWallet_returnsExistingWallet() {
        when(walletRepository.findByUserId("alice")).thenReturn(Optional.of(walletAlice));

        WalletResponse result = walletService.getOrCreateWallet("alice");

        assertThat(result.getUserId()).isEqualTo("alice");
        assertThat(result.getBalance()).isEqualTo(100.0);
        verify(walletRepository, never()).save(any());
    }

    @Test
    void getOrCreateWallet_createsNewWalletWithWelcomeBalance() {
        WalletEntity saved = new WalletEntity();
        saved.setId("wallet-new");
        saved.setUserId("charlie");
        saved.setBalance(50.0);
        saved.setCurrency("EUR");

        when(walletRepository.findByUserId("charlie")).thenReturn(Optional.empty());
        when(walletRepository.save(any())).thenReturn(saved);

        WalletResponse result = walletService.getOrCreateWallet("charlie");

        assertThat(result.getBalance()).isEqualTo(50.0);
        assertThat(result.getUserId()).isEqualTo("charlie");

        ArgumentCaptor<WalletEntity> walletCaptor = ArgumentCaptor.forClass(WalletEntity.class);
        verify(walletRepository).save(walletCaptor.capture());
        assertThat(walletCaptor.getValue().getBalance()).isEqualTo(50.0);
        assertThat(walletCaptor.getValue().getCurrency()).isEqualTo("EUR");

        verify(ledgerRepository).save(any(LedgerEntry.class));
    }

    // ─── getMovements ────────────────────────────────────────────────────

    @Test
    void getMovements_throwsWhenWalletNotFound() {
        when(walletRepository.findByUserId("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> walletService.getMovements("unknown"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Wallet no encontrado");
    }

    @Test
    void getMovements_returnsLedgerEntries() {
        LedgerEntry entry = new LedgerEntry();
        entry.setId("entry-1");
        entry.setWalletId("wallet-alice");
        entry.setUserId("alice");
        entry.setType(LedgerEntry.Type.CREDIT);
        entry.setAmount(50.0);
        entry.setBalanceAfter(50.0);
        entry.setCorrelationId("welcome-alice");
        entry.setDescription("Saldo de bienvenida PayFlow");

        when(walletRepository.findByUserId("alice")).thenReturn(Optional.of(walletAlice));
        when(ledgerRepository.findByWalletIdOrderByCreatedAtDesc("wallet-alice"))
                .thenReturn(List.of(entry));

        var movements = walletService.getMovements("alice");

        assertThat(movements).hasSize(1);
        assertThat(movements.get(0).getType()).isEqualTo("CREDIT");
        assertThat(movements.get(0).getAmount()).isEqualTo(50.0);
    }

    // ─── send ────────────────────────────────────────────────────────────

    @Test
    void send_throwsWhenSelfTransfer() {
        SendMoneyRequest req = new SendMoneyRequest();
        req.setToUserId("alice");
        req.setAmount(10.0);

        assertThatThrownBy(() -> walletService.send("alice", req, null))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("No puedes enviarte dinero a ti mismo");
    }

    @Test
    void send_throwsWhenInsufficientBalance() {
        walletAlice.setBalance(5.0);

        when(ledgerRepository.findFirstByCorrelationIdAndUserId(anyString(), eq("alice")))
                .thenReturn(Optional.empty());
        when(walletRepository.findByUserId("alice")).thenReturn(Optional.of(walletAlice));
        when(walletRepository.findByUserId("bob")).thenReturn(Optional.of(walletBob));

        SendMoneyRequest req = new SendMoneyRequest();
        req.setToUserId("bob");
        req.setAmount(20.0);

        assertThatThrownBy(() -> walletService.send("alice", req, "key-001"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Saldo insuficiente")
                .hasMessageContaining("5,00 EUR");
    }

    @Test
    void send_transfersMoneyAndCreatesDoubleEntryLedger() {
        when(ledgerRepository.findFirstByCorrelationIdAndUserId(anyString(), eq("alice")))
                .thenReturn(Optional.empty());
        when(walletRepository.findByUserId("alice")).thenReturn(Optional.of(walletAlice));
        when(walletRepository.findByUserId("bob")).thenReturn(Optional.of(walletBob));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SendMoneyRequest req = new SendMoneyRequest();
        req.setToUserId("bob");
        req.setAmount(30.0);
        req.setDescription("Cena del viernes");

        WalletResponse result = walletService.send("alice", req, "key-001");

        assertThat(result.getBalance()).isEqualTo(70.0);
        assertThat(walletBob.getBalance()).isEqualTo(80.0);

        verify(walletRepository, times(2)).save(any(WalletEntity.class));
        verify(ledgerRepository, times(2)).save(any(LedgerEntry.class));
    }

    @Test
    void send_isIdempotent_whenCorrelationIdAlreadyProcessed() {
        LedgerEntry existingEntry = new LedgerEntry();
        existingEntry.setCorrelationId("key-already-sent");
        existingEntry.setUserId("alice");

        when(ledgerRepository.findFirstByCorrelationIdAndUserId("key-already-sent", "alice"))
                .thenReturn(Optional.of(existingEntry));
        when(walletRepository.findByUserId("alice")).thenReturn(Optional.of(walletAlice));

        SendMoneyRequest req = new SendMoneyRequest();
        req.setToUserId("bob");
        req.setAmount(30.0);

        WalletResponse result = walletService.send("alice", req, "key-already-sent");

        assertThat(result.getBalance()).isEqualTo(100.0);
        verify(walletRepository, never()).save(any());
        verify(ledgerRepository, never()).save(any());
    }

    @Test
    void send_usesDefaultDescription_whenDescriptionIsNull() {
        when(ledgerRepository.findFirstByCorrelationIdAndUserId(anyString(), eq("alice")))
                .thenReturn(Optional.empty());
        when(walletRepository.findByUserId("alice")).thenReturn(Optional.of(walletAlice));
        when(walletRepository.findByUserId("bob")).thenReturn(Optional.of(walletBob));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SendMoneyRequest req = new SendMoneyRequest();
        req.setToUserId("bob");
        req.setAmount(10.0);
        req.setDescription(null);

        walletService.send("alice", req, null);

        ArgumentCaptor<LedgerEntry> entryCaptor = ArgumentCaptor.forClass(LedgerEntry.class);
        verify(ledgerRepository, times(2)).save(entryCaptor.capture());
        entryCaptor.getAllValues().forEach(e ->
                assertThat(e.getDescription()).isEqualTo("Envío P2P"));
    }

    @Test
    void send_generatesCorrelationId_whenIdempotencyKeyIsNull() {
        when(ledgerRepository.findFirstByCorrelationIdAndUserId(anyString(), eq("alice")))
                .thenReturn(Optional.empty());
        when(walletRepository.findByUserId("alice")).thenReturn(Optional.of(walletAlice));
        when(walletRepository.findByUserId("bob")).thenReturn(Optional.of(walletBob));
        when(walletRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SendMoneyRequest req = new SendMoneyRequest();
        req.setToUserId("bob");
        req.setAmount(10.0);

        walletService.send("alice", req, null);

        ArgumentCaptor<LedgerEntry> captor = ArgumentCaptor.forClass(LedgerEntry.class);
        verify(ledgerRepository, times(2)).save(captor.capture());
        String correlation = captor.getAllValues().get(0).getCorrelationId();
        assertThat(correlation).isNotBlank().isNotEqualTo("null");
        captor.getAllValues().forEach(e ->
                assertThat(e.getCorrelationId()).isEqualTo(correlation));
    }
}
