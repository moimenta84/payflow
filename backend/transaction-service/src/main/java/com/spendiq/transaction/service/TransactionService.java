package com.spendiq.transaction.service;

import com.spendiq.transaction.dto.SummaryResponse;
import com.spendiq.transaction.dto.TransactionRequest;
import com.spendiq.transaction.dto.TransactionResponse;
import com.spendiq.transaction.entity.TransactionEntity;
import com.spendiq.transaction.entity.TransactionEntity.Tipo;
import com.spendiq.transaction.messaging.TransactionPublisher;
import com.spendiq.transaction.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final TransactionPublisher  transactionPublisher;

    public TransactionService(TransactionRepository transactionRepository,
                              TransactionPublisher transactionPublisher) {
        this.transactionRepository = transactionRepository;
        this.transactionPublisher  = transactionPublisher;
    }

    // ─────────────────────────────────────────────────────────
    // CREAR TRANSACCIÓN
    // ─────────────────────────────────────────────────────────
    public TransactionResponse create(String userId, TransactionRequest request) {

        TransactionEntity transaction = new TransactionEntity();
        transaction.setUserId(userId);
        transaction.setTipo(request.getTipo());
        transaction.setCategoria(request.getCategoria());
        transaction.setDescripcion(request.getDescripcion());
        transaction.setCantidad(request.getCantidad());
        transaction.setFecha(request.getFecha());

        TransactionResponse response = new TransactionResponse(transactionRepository.save(transaction));

        // Notifica al trading-service vía IBM MQ para que pueda actualizar el balance disponible
        transactionPublisher.publish(response);

        return response;
    }

    // ─────────────────────────────────────────────────────────
    // HISTORIAL DEL USUARIO
    // ─────────────────────────────────────────────────────────
    public List<TransactionResponse> getAll(String userId) {
        return transactionRepository.findByUserIdOrderByFechaDesc(userId)
                .stream()
                .map(TransactionResponse::new)
                .toList();
    }

    // ─────────────────────────────────────────────────────────
    // RESUMEN: INGRESOS, GASTOS Y BALANCE
    // ─────────────────────────────────────────────────────────
    public SummaryResponse getSummary(String userId) {
        Double ingresos = transactionRepository.sumCantidadByUserIdAndTipo(userId, Tipo.INGRESO);
        Double gastos   = transactionRepository.sumCantidadByUserIdAndTipo(userId, Tipo.GASTO);
        return new SummaryResponse(ingresos, gastos);
    }

    // ─────────────────────────────────────────────────────────
    // ELIMINAR TRANSACCIÓN
    // ─────────────────────────────────────────────────────────
    public void delete(String userId, String transactionId) {

        // Buscamos por id Y userId — un usuario no puede borrar transacciones ajenas
        TransactionEntity transaction = transactionRepository
                .findByIdAndUserId(transactionId, userId)
                .orElseThrow(() -> new RuntimeException("Transacción no encontrada"));

        transactionRepository.delete(transaction);
    }
}
