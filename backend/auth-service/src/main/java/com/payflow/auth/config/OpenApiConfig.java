package com.payflow.auth.config;

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
                .title("PayFlow · Auth API")
                .description("Servicio de autenticación: registro, login, perfil y administración de usuarios. "
                        + "Emite tokens JWT que el API Gateway valida en el resto de servicios.")
                .version("1.0.0")
                .contact(new Contact().name("Iker Martínez Velasco")));
    }
}
