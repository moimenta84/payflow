package com.spendiq.price;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PriceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PriceApplication.class, args);
    }
}
