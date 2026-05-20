package com.payflow.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

// @Configuration indica que esta clase define beans de configuración de Spring
@Configuration
public class SecurityConfig {

    // SecurityFilterChain define las reglas de seguridad HTTP del servicio
    // @Bean registra este método como un bean gestionado por Spring
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
            // Desactivamos CSRF (Cross-Site Request Forgery)
            // En APIs REST con JWT no hace falta — CSRF protege formularios con sesión,
            // pero aquí no hay sesión, cada petición lleva su propio token JWT
            .csrf(AbstractHttpConfigurer::disable)

            // Permitimos todas las peticiones sin autenticación a nivel de este servicio
            // La validación del JWT ya la hace el api-gateway antes de llegar aquí
            // Este servicio confía en que el gateway solo deja pasar peticiones válidas
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            );

        return http.build();
    }

    // PasswordEncoder es el bean que usa AuthService para cifrar y comparar contraseñas
    // BCrypt es el algoritmo estándar para contraseñas — aplica un salt aleatorio
    // cada vez, por lo que el mismo texto plano genera hashes diferentes
    // El coste por defecto es 10 rondas — equilibrio entre seguridad y rendimiento
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
