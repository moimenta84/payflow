package com.payflow.transaction.repository;

import com.payflow.transaction.entity.TransactionEntity;
import com.payflow.transaction.entity.TransactionEntity.Tipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<TransactionEntity, String> {

    // Historial completo del usuario ordenado por fecha descendente
    List<TransactionEntity> findByUserIdOrderByFechaDesc(String userId);

    // Necesario para validar que el usuario solo borra sus propias transacciones
    Optional<TransactionEntity> findByIdAndUserId(String id, String userId);

    // Suma de cantidades por tipo — usada en el resumen del dashboard
    @Query("SELECT COALESCE(SUM(t.cantidad), 0) FROM TransactionEntity t WHERE t.userId = :userId AND t.tipo = :tipo")
    Double sumCantidadByUserIdAndTipo(String userId, Tipo tipo);

    // Transacciones de un mes concreto — usada para el informe PDF
    List<TransactionEntity> findByUserIdAndFechaBetweenOrderByFechaDesc(
            String userId, LocalDate from, LocalDate to);
}
