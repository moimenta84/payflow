package com.spendiq.trading.repository;

import com.spendiq.trading.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<OrderEntity, String> {
    List<OrderEntity> findByUserIdOrderByFechaDesc(String userId);
}
