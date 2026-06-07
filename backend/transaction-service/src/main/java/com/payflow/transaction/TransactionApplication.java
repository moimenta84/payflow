package com.payflow.transaction;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.jms.annotation.EnableJms;

// Arranque del transaction-service: ingresos/gastos del usuario e informes PDF.
// @EnableJms activa la mensajería (publica cada transacción nueva en la cola).
@SpringBootApplication
@EnableJms
public class TransactionApplication {
    public static void main(String[] args) {
        SpringApplication.run(TransactionApplication.class, args);
    }
}
