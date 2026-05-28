package com.payflow.wallet.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI apiInfo() {
        return new OpenAPI().info(new Info()
                .title("PayFlow · Wallet API")
                .description("Cartera digital del usuario: consulta de saldo, libro de movimientos "
                        + "y envío de dinero entre carteras.")
                .version("1.0.0")
                .contact(new Contact().name("Iker Martínez Velasco")));
    }
}
