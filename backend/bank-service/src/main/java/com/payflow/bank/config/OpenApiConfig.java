package com.payflow.bank.config;

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
                .title("PayFlow · Bank API")
                .description("Integración de Open Banking (PSD2 / Nordigen): conexión de cuentas bancarias, "
                        + "sincronización de transacciones y desconexión.")
                .version("1.0.0")
                .contact(new Contact().name("Iker Martínez Velasco")));
    }
}
