package com.payflow.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

// Filtro del gateway que valida el JWT en las rutas protegidas.
// Es la pieza central de seguridad: los microservicios confían en el gateway y no revalidan el token.
@Component
public class JwtAuthFilter extends AbstractGatewayFilterFactory<Object> {

    // El mismo secreto que usa el auth-service para firmar. Debe coincidir o la verificación falla.
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Override
    public GatewayFilter apply(Object config) {
        return (exchange, chain) -> {
            var authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");

            // Sin cabecera "Authorization: Bearer ..." cortamos la petición con 401 (no autorizado).
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            try {
                String token = authHeader.substring(7); // Quitamos el prefijo "Bearer ".
                var key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
                // verifyWith comprueba la firma: si el token está manipulado o caducado, lanza excepción.
                var claims = Jwts.parser().verifyWith(key).build()
                        .parseSignedClaims(token).getPayload();

                // Extraemos los datos del token y los inyectamos como cabeceras para el microservicio destino.
                // Así el servicio sabe quién es el usuario sin tener que tocar el JWT.
                String rol = claims.get("rol", String.class);
                var mutated = exchange.getRequest().mutate()
                        .header("X-User-Id", claims.getSubject())
                        .header("X-User-Email", claims.get("email", String.class))
                        .header("X-User-Rol", rol != null ? rol : "USER")
                        .build();

                return chain.filter(exchange.mutate().request(mutated).build());

            } catch (Exception e) {
                // Cualquier fallo al verificar (firma inválida, token caducado...) → 401.
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
        };
    }
}
