package com.payflow.invoicing.repository;

import com.payflow.invoicing.entity.InvoiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<InvoiceEntity, String> {
    List<InvoiceEntity> findByUserIdOrderByFechaDesc(String userId);
    Optional<InvoiceEntity> findByIdAndUserId(String id, String userId);
    List<InvoiceEntity> findByUserIdAndFechaBetweenAndEstadoNot(
            String userId, LocalDate from, LocalDate to, InvoiceEntity.Estado estado);

    @Query("SELECT COUNT(i) FROM InvoiceEntity i WHERE i.userId = :userId AND FUNCTION('YEAR', i.fecha) = :year")
    long countByUserIdAndYear(@Param("userId") String userId, @Param("year") int year);
}
