package com.payflow.invoicing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Arranque del invoicing-service: facturas, gastos deducibles y resúmenes fiscales del autónomo.
@SpringBootApplication
public class InvoicingApplication {
    public static void main(String[] args) {
        SpringApplication.run(InvoicingApplication.class, args);
    }
}
