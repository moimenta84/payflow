package com.payflow.transaction.config;

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
                .title("PayFlow · Transactions API")
                .description("Gestión de transacciones (gastos e ingresos): CRUD, filtros por categoría "
                        + "y periodo, resúmenes e informes PDF.")
                .version("1.0.0")
                .contact(new Contact().name("Iker Martínez Velasco")));
    }
}
