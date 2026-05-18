package com.spendiq.auth.service;

import com.spendiq.auth.dto.AuthResponse;
import com.spendiq.auth.dto.LoginRequest;
import com.spendiq.auth.dto.RegisterRequest;
import com.spendiq.auth.dto.UserResponse;
import com.spendiq.auth.entity.UserEntity;
import com.spendiq.auth.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

// @Service le dice a Spring que esta clase contiene lógica de negocio
// Spring la registra como bean y permite inyectarla en otros componentes
@Service
public class AuthService {

    private final UserRepository userRepository;

    // PasswordEncoder es un bean de Spring Security configurado en SecurityConfig
    // Usaremos BCrypt — cifra la contraseña con un salt aleatorio
    private final PasswordEncoder passwordEncoder;

    // Carga el valor de app.jwt.secret desde application.properties
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    // Tiempo de expiración del token en milisegundos (86400000 = 24 horas)
    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    // Inyección de dependencias por constructor — forma recomendada en Spring
    // Evita problemas de dependencias circulares y facilita los tests
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ─────────────────────────────────────────────────────────
    // REGISTRO
    // ─────────────────────────────────────────────────────────
    public AuthResponse register(RegisterRequest request) {

        // Comprobamos que no exista ya un usuario con ese email
        // existsByEmail() genera: SELECT COUNT(*) FROM users WHERE email = ?
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        // Construimos la entidad con los datos del DTO
        UserEntity user = new UserEntity();
        user.setEmail(request.getEmail());

        // Ciframos la contraseña antes de guardarla — nunca se guarda en texto plano
        // BCrypt genera un hash diferente cada vez gracias al salt aleatorio
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.setNombre(request.getNombre());
        user.setApellido(request.getApellido());

        // Si no manda saldoInicial usamos 0.0 como valor por defecto
        user.setSaldoInicial(request.getSaldoInicial() != null ? request.getSaldoInicial() : 0.0);

        // El rol siempre es USER al registrarse — nunca se puede autoasignar ADMIN
        // No hace falta setRol() porque UserEntity ya tiene Rol.USER como valor por defecto

        // Guardamos en la BD — Hibernate genera: INSERT INTO users (...)
        userRepository.save(user);

        // Generamos el JWT y devolvemos token + datos del usuario al frontend
        return new AuthResponse(generateToken(user), new UserResponse(user));
    }

    // ─────────────────────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────────────────────
    public AuthResponse login(LoginRequest request) {

        // Buscamos el usuario por email
        // Usamos el mismo mensaje para email y contraseña incorrectos — no damos pistas
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Credenciales incorrectas"));

        // matches() compara la contraseña en texto plano con el hash BCrypt de la BD
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Credenciales incorrectas");
        }

        // Login correcto — generamos el JWT y devolvemos token + datos del usuario
        return new AuthResponse(generateToken(user), new UserResponse(user));
    }

    // ─────────────────────────────────────────────────────────
    // OBTENER PERFIL
    // ─────────────────────────────────────────────────────────
    public UserResponse getUser(String userId) {

        // Buscamos por el id que viene en el header X-User-Id (puesto por el gateway)
        // Hibernate genera: SELECT * FROM users WHERE id = ?
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return new UserResponse(user);
    }

    // ─────────────────────────────────────────────────────────
    // ACTUALIZAR PERFIL
    // ─────────────────────────────────────────────────────────
    public UserResponse updateUser(String userId, RegisterRequest request) {

        // Recuperamos el usuario actual de la BD
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Solo actualizamos los campos editables desde el perfil
        // No permitimos cambiar email ni rol desde este endpoint
        if (request.getNombre() != null)       user.setNombre(request.getNombre());
        if (request.getApellido() != null)     user.setApellido(request.getApellido());
        if (request.getSaldoInicial() != null) user.setSaldoInicial(request.getSaldoInicial());

        // Guardamos los cambios — Hibernate genera: UPDATE users SET ... WHERE id = ?
        return new UserResponse(userRepository.save(user));
    }

    // ─────────────────────────────────────────────────────────
    // RECUPERAR CONTRASEÑA
    // ─────────────────────────────────────────────────────────
    public void resetPassword(String email) {

        // Comprobamos que el email existe — mismo mensaje si no existe (seguridad)
        userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Si el email existe recibirás un correo"));

        // TODO: integrar Spring Mail para enviar el email de recuperación real
    }

    // ─────────────────────────────────────────────────────────
    // GENERAR JWT (privado — solo lo usan register y login)
    // ─────────────────────────────────────────────────────────
    private String generateToken(UserEntity user) {

        // Creamos la clave HMAC a partir del secret definido en application.properties
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        // Fecha de emisión y expiración del token
        Date issuedAt   = new Date();
        Date expiration = new Date(System.currentTimeMillis() + jwtExpiration);

        return Jwts.builder()
                // subject es el identificador principal — usamos el userId
                // El gateway lo extrae y lo mete en el header X-User-Id de cada petición
                .subject(user.getId())

                // Claims adicionales que viajan dentro del token
                // El resto de microservicios pueden leerlos sin consultar la BD
                .claims(Map.of(
                        "email",  user.getEmail(),
                        "nombre", user.getNombre(),
                        "rol",    user.getRol().name()
                ))

                .issuedAt(issuedAt)
                .expiration(expiration)

                // Firmamos el token — si alguien lo modifica la firma no coincide
                .signWith(key)
                .compact();
    }
}
