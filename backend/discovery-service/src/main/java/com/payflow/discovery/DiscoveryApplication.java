package com.payflow.discovery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

// Servidor de descubrimiento (Eureka): el "directorio" donde cada microservicio se registra al arrancar.
// Así el gateway encuentra los servicios por su nombre (lb://wallet-service) sin saber su IP ni puerto.
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryApplication.class, args);
    }
}
