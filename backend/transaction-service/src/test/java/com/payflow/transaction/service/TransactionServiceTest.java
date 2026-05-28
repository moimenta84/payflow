package com.payflow.transaction.service;

import com.payflow.transaction.dto.SummaryResponse;
import com.payflow.transaction.dto.TransactionRequest;
import com.payflow.transaction.dto.TransactionResponse;
import com.payflow.transaction.entity.TransactionEntity;
import com.payflow.transaction.entity.TransactionEntity.Categoria;
import com.payflow.transaction.entity.TransactionEntity.Tipo;
import com.payflow.transaction.messaging.TransactionPublisher;
import com.payflow.transaction.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private TransactionPublisher transactionPublisher;

    @InjectMocks
    private TransactionService transactionService;

    private TransactionEntity savedEntity;

    @BeforeEach
    void setUp() {
        savedEntity = new TransactionEntity();
        ReflectionTestUtils.setField(savedEntity, "id", "txn-001");
        savedEntity.setUserId("user-alice");
        savedEntity.setTipo(Tipo.INGRESO);
        savedEntity.setCategoria(Categoria.SALARIO);
        savedEntity.setDescripcion("Nómina mayo");
        savedEntity.setCantidad(1500.0);
        savedEntity.setFecha(LocalDate.of(2026, 5, 1));
    }

    // ─── create ─────────────────────────────────────────────────────────

    @Test
    void create_savesTransactionAndPublishesEvent() {
        when(transactionRepository.save(any())).thenReturn(savedEntity);

        TransactionRequest req = buildRequest(Tipo.INGRESO, Categoria.SALARIO, "Nómina mayo", 1500.0);

        TransactionResponse result = transactionService.create("user-alice", req);

        assertThat(result.getTipo()).isEqualTo("INGRESO");
        assertThat(result.getCantidad()).isEqualTo(1500.0);
        assertThat(result.getDescripcion()).isEqualTo("Nómina mayo");

        verify(transactionRepository).save(any(TransactionEntity.class));
        verify(transactionPublisher).publish(any(TransactionResponse.class));
    }

    @Test
    void create_publishesExactlyOnce() {
        when(transactionRepository.save(any())).thenReturn(savedEntity);

        transactionService.create("user-alice", buildRequest(Tipo.INGRESO, Categoria.SALARIO, "Test", 100.0));

        verify(transactionPublisher, times(1)).publish(any());
    }

    @Test
    void create_mapsAllFieldsFromRequest() {
        when(transactionRepository.save(any())).thenReturn(savedEntity);

        TransactionRequest req = buildRequest(Tipo.INGRESO, Categoria.SALARIO, "Nómina mayo", 1500.0);
        req.setFecha(LocalDate.of(2026, 5, 1));

        transactionService.create("user-alice", req);

        ArgumentCaptor<TransactionEntity> captor = ArgumentCaptor.forClass(TransactionEntity.class);
        verify(transactionRepository).save(captor.capture());
        TransactionEntity captured = captor.getValue();

        assertThat(captured.getUserId()).isEqualTo("user-alice");
        assertThat(captured.getTipo()).isEqualTo(Tipo.INGRESO);
        assertThat(captured.getCategoria()).isEqualTo(Categoria.SALARIO);
        assertThat(captured.getDescripcion()).isEqualTo("Nómina mayo");
        assertThat(captured.getCantidad()).isEqualTo(1500.0);
        assertThat(captured.getFecha()).isEqualTo(LocalDate.of(2026, 5, 1));
    }

    // ─── getAll ──────────────────────────────────────────────────────────

    @Test
    void getAll_returnsTransactionList() {
        TransactionEntity gasto = new TransactionEntity();
        ReflectionTestUtils.setField(gasto, "id", "txn-002");
        gasto.setUserId("user-alice");
        gasto.setTipo(Tipo.GASTO);
        gasto.setCategoria(Categoria.ALIMENTACION);
        gasto.setDescripcion("Mercadona");
        gasto.setCantidad(45.50);
        gasto.setFecha(LocalDate.of(2026, 5, 24));

        when(transactionRepository.findByUserIdOrderByFechaDesc("user-alice"))
                .thenReturn(List.of(savedEntity, gasto));

        List<TransactionResponse> result = transactionService.getAll("user-alice");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTipo()).isEqualTo("INGRESO");
        assertThat(result.get(1).getTipo()).isEqualTo("GASTO");
    }

    @Test
    void getAll_returnsEmptyListWhenNoTransactions() {
        when(transactionRepository.findByUserIdOrderByFechaDesc("user-alice"))
                .thenReturn(List.of());

        assertThat(transactionService.getAll("user-alice")).isEmpty();
    }

    // ─── getSummary ──────────────────────────────────────────────────────

    @Test
    void getSummary_calculatesBalanceCorrectly() {
        when(transactionRepository.sumCantidadByUserIdAndTipo("user-alice", Tipo.INGRESO)).thenReturn(1500.0);
        when(transactionRepository.sumCantidadByUserIdAndTipo("user-alice", Tipo.GASTO)).thenReturn(400.0);

        SummaryResponse result = transactionService.getSummary("user-alice");

        assertThat(result.getTotalIngresos()).isEqualTo(1500.0);
        assertThat(result.getTotalGastos()).isEqualTo(400.0);
        assertThat(result.getBalance()).isEqualTo(1100.0);
    }

    @Test
    void getSummary_zeroWhenNoTransactions() {
        when(transactionRepository.sumCantidadByUserIdAndTipo("user-alice", Tipo.INGRESO)).thenReturn(0.0);
        when(transactionRepository.sumCantidadByUserIdAndTipo("user-alice", Tipo.GASTO)).thenReturn(0.0);

        SummaryResponse result = transactionService.getSummary("user-alice");

        assertThat(result.getBalance()).isEqualTo(0.0);
    }

    // ─── update ──────────────────────────────────────────────────────────

    @Test
    void update_updatesFieldsAndReturnsResponse() {
        when(transactionRepository.findByIdAndUserId("txn-001", "user-alice"))
                .thenReturn(Optional.of(savedEntity));
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TransactionRequest req = new TransactionRequest();
        req.setDescripcion("Nómina actualizada");
        req.setCantidad(1600.0);

        TransactionResponse result = transactionService.update("user-alice", "txn-001", req);

        assertThat(result.getDescripcion()).isEqualTo("Nómina actualizada");
        assertThat(result.getCantidad()).isEqualTo(1600.0);
    }

    @Test
    void update_throwsWhenTransactionNotFound() {
        when(transactionRepository.findByIdAndUserId("txn-999", "user-alice"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.update("user-alice", "txn-999",
                new TransactionRequest()))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Transacción no encontrada");
    }

    @Test
    void update_preventsAccessToOtherUsersTransactions() {
        // findByIdAndUserId returns empty when userId doesn't match
        when(transactionRepository.findByIdAndUserId("txn-001", "user-bob"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.update("user-bob", "txn-001",
                new TransactionRequest()))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Transacción no encontrada");
    }

    @Test
    void update_onlyUpdatesNonNullFields() {
        when(transactionRepository.findByIdAndUserId("txn-001", "user-alice"))
                .thenReturn(Optional.of(savedEntity));
        when(transactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        TransactionRequest req = new TransactionRequest();
        req.setDescripcion("Solo descripción cambia");
        // tipo, categoria, cantidad, fecha all null

        transactionService.update("user-alice", "txn-001", req);

        assertThat(savedEntity.getTipo()).isEqualTo(Tipo.INGRESO);
        assertThat(savedEntity.getCantidad()).isEqualTo(1500.0);
    }

    // ─── delete ──────────────────────────────────────────────────────────

    @Test
    void delete_removesTransaction() {
        when(transactionRepository.findByIdAndUserId("txn-001", "user-alice"))
                .thenReturn(Optional.of(savedEntity));

        transactionService.delete("user-alice", "txn-001");

        verify(transactionRepository).delete(savedEntity);
    }

    @Test
    void delete_throwsWhenNotFound() {
        when(transactionRepository.findByIdAndUserId("txn-999", "user-alice"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.delete("user-alice", "txn-999"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Transacción no encontrada");

        verify(transactionRepository, never()).delete(any());
    }

    @Test
    void delete_preventsAccessToOtherUsersTransactions() {
        when(transactionRepository.findByIdAndUserId("txn-001", "user-bob"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.delete("user-bob", "txn-001"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Transacción no encontrada");
    }

    // ─── helpers ────────────────────────────────────────────────────────

    private TransactionRequest buildRequest(Tipo tipo, Categoria categoria, String descripcion, Double cantidad) {
        TransactionRequest req = new TransactionRequest();
        req.setTipo(tipo);
        req.setCategoria(categoria);
        req.setDescripcion(descripcion);
        req.setCantidad(cantidad);
        req.setFecha(LocalDate.now());
        return req;
    }
}
