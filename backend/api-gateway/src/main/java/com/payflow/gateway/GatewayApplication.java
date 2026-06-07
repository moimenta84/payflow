package com.payflow.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Arranque del API Gateway: única puerta de entrada que recibe todas las peticiones del frontend
// y las redirige al microservicio correspondiente, aplicando los filtros de seguridad (JWT/Admin).
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
