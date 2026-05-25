package com.payflow.invoicing.repository;

import com.payflow.invoicing.entity.ExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<ExpenseEntity, String> {
    List<ExpenseEntity> findByUserIdOrderByFechaDesc(String userId);
    Optional<ExpenseEntity> findByIdAndUserId(String id, String userId);
    List<ExpenseEntity> findByUserIdAndFechaBetweenAndDeducibleTrue(
            String userId, LocalDate from, LocalDate to);
}
