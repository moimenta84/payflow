package com.payflow.auth.service;

import com.payflow.auth.dto.AuthResponse;
import com.payflow.auth.dto.LoginRequest;
import com.payflow.auth.dto.LookupResponse;
import com.payflow.auth.dto.RegisterRequest;
import com.payflow.auth.dto.RolRequest;
import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.entity.UserEntity;
import com.payflow.auth.exception.ApiException;
import com.payflow.auth.repository.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Date;
import java.util.List;
import java.util.Map;

// @Service le dice a Spring que esta clase contiene lógica de negocio
// Spring la registra como bean y permite inyectarla en otros componentes
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    // Secreto JWT de desarrollo que viene por defecto en application.properties.
    // Si se detecta en ejecución, significa que NO se ha definido la variable de
    // entorno JWT_SECRET y se está firmando con un secreto público (está en el repo).
    private static final String INSECURE_DEV_SECRET = "payflow-super-secret-key-2024-tfg";

    private final UserRepository  userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender  mailSender;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpiration;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JavaMailSender mailSender) {
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender      = mailSender;
    }

    // Aviso de seguridad al arrancar: si se está usando el secreto JWT por defecto
    // (el del repositorio), cualquiera podría forjar tokens válidos. En producción
    // hay que definir la variable de entorno JWT_SECRET con un valor fuerte y único.
    @PostConstruct
    void avisarSecretoInseguro() {
        if (INSECURE_DEV_SECRET.equals(jwtSecret)) {
            log.warn("================================================================");
            log.warn("  SEGURIDAD: usando el secreto JWT por defecto de DESARROLLO.");
            log.warn("  Define la variable de entorno JWT_SECRET (valor fuerte y único)");
            log.warn("  antes de desplegar en producción. El gateway debe usar el mismo.");
            log.warn("================================================================");
        }
    }

    // ─────────────────────────────────────────────────────────
    // REGISTRO
    // ─────────────────────────────────────────────────────────
    public AuthResponse register(RegisterRequest request) {

        // Comprobamos que no exista ya un usuario con ese email
        // existsByEmail() genera: SELECT COUNT(*) FROM users WHERE email = ?
        if (userRepository.existsByEmail(request.getEmail())) {
            throw ApiException.conflict("El email ya está registrado");
        }

        // Construimos la entidad con los datos del DTO
        UserEntity user = new UserEntity();
        user.setEmail(request.getEmail());

        // Ciframos la contraseña antes de guardarla — nunca se guarda en texto plano
        // BCrypt genera un hash diferente cada vez gracias al salt aleatorio
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.setNombre(request.getNombre());
        user.setApellido(request.getApellido());
        user.setTelefono(normalizeTelefono(request.getTelefono()));

        // Si no manda saldoInicial usamos 0.0 como valor por defecto
        user.setSaldoInicial(request.getSaldoInicial() != null ? request.getSaldoInicial() : 0.0);

        // El rol siempre es USER al registrarse — nunca se puede autoasignar ADMIN
        // No hace falta setRol() porque UserEntity ya tiene Rol.USER como valor por defecto

        // Guardamos en la BD — Hibernate genera: INSERT INTO users (...)
        userRepository.save(user);

        // Email de bienvenida — no bloquea el registro si falla
        sendWelcomeEmail(user);

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
                .orElseThrow(() -> ApiException.unauthorized("Credenciales incorrectas"));

        // matches() compara la contraseña en texto plano con el hash BCrypt de la BD
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw ApiException.unauthorized("Credenciales incorrectas");
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
                .orElseThrow(() -> ApiException.notFound("Usuario no encontrado"));
        return new UserResponse(user);
    }

    // ─────────────────────────────────────────────────────────
    // BUSCAR USUARIO POR TELÉFONO (para enviar dinero por número)
    // Devuelve solo userId + nombre; nunca datos sensibles del destinatario.
    // ─────────────────────────────────────────────────────────
    public LookupResponse lookupByTelefono(String telefono) {
        String norm = normalizeTelefono(telefono);
        UserEntity user = (norm == null) ? null
                : userRepository.findByTelefono(norm).orElse(null);
        if (user == null) {
            throw ApiException.notFound("No hay ningún usuario PayFlow con ese número");
        }
        String fullName = user.getNombre()
                + (user.getApellido() != null ? " " + user.getApellido() : "");
        return new LookupResponse(user.getId(), fullName);
    }

    // Normaliza un teléfono a solo dígitos (quita espacios, guiones, paréntesis, +).
    // Así "+34 600 11 22 33" y "600112233" se comparan de forma consistente.
    private String normalizeTelefono(String telefono) {
        if (telefono == null) return null;
        String digits = telefono.replaceAll("[^0-9]", "");
        return digits.isBlank() ? null : digits;
    }

    // ─────────────────────────────────────────────────────────
    // ACTUALIZAR PERFIL
    // ─────────────────────────────────────────────────────────
    public UserResponse updateUser(String userId, RegisterRequest request) {

        // Recuperamos el usuario actual de la BD
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Usuario no encontrado"));

        // Solo actualizamos los campos editables desde el perfil
        // No permitimos cambiar email ni rol desde este endpoint
        if (request.getNombre() != null)       user.setNombre(request.getNombre());
        if (request.getApellido() != null)     user.setApellido(request.getApellido());
        if (request.getTelefono() != null)     user.setTelefono(normalizeTelefono(request.getTelefono()));
        if (request.getSaldoInicial() != null) user.setSaldoInicial(request.getSaldoInicial());

        // Guardamos los cambios — Hibernate genera: UPDATE users SET ... WHERE id = ?
        return new UserResponse(userRepository.save(user));
    }

    // ─────────────────────────────────────────────────────────
    // ADMIN — LISTAR TODOS LOS USUARIOS
    // ─────────────────────────────────────────────────────────
    public List<UserResponse> getAllUsers() {
        log.info("Admin solicita listado completo de usuarios");
        return userRepository.findAll().stream()
                .map(UserResponse::new)
                .toList();
    }

    // ─────────────────────────────────────────────────────────
    // ADMIN — CAMBIAR ROL DE UN USUARIO
    // ─────────────────────────────────────────────────────────
    public UserResponse changeRol(String userId, RolRequest request) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("Usuario no encontrado"));
        log.info("Admin cambia rol de {} de {} a {}", user.getEmail(), user.getRol(), request.getRol());
        user.setRol(request.getRol());
        return new UserResponse(userRepository.save(user));
    }

    // ─────────────────────────────────────────────────────────
    // ADMIN — ELIMINAR USUARIO
    // ─────────────────────────────────────────────────────────
    public void deleteUser(String userId) {
        if (!userRepository.existsById(userId)) {
            throw ApiException.notFound("Usuario no encontrado");
        }
        log.info("Admin elimina usuario {}", userId);
        userRepository.deleteById(userId);
    }

    // ─────────────────────────────────────────────────────────
    // RECUPERAR CONTRASEÑA
    // Genera contraseña temporal, la guarda y envía por email.
    // Nunca revela si el email está registrado (responde igual siempre).
    // ─────────────────────────────────────────────────────────
    public void resetPassword(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            String tempPassword = generateTempPassword(10);
            user.setPassword(passwordEncoder.encode(tempPassword));
            userRepository.save(user);
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom(mailFrom.isBlank() ? "noreply@payflow.app" : mailFrom);
                msg.setTo(email);
                msg.setSubject("PayFlow — Contraseña temporal");
                msg.setText(
                    "Hola " + user.getNombre() + ",\n\n" +
                    "Tu contraseña temporal es: " + tempPassword + "\n\n" +
                    "Inicia sesión y cámbiala desde tu perfil.\n\n" +
                    "El equipo de PayFlow"
                );
                mailSender.send(msg);
                log.info("Email de recuperación enviado a {}", email);
            } catch (Exception ex) {
                log.warn("No se pudo enviar el email de recuperación a {}: {}", email, ex.getMessage());
            }
        });
    }

    private void sendWelcomeEmail(UserEntity user) {
        if (mailFrom.isBlank()) return;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(mailFrom);
            msg.setTo(user.getEmail());
            msg.setSubject("¡Bienvenido a PayFlow!");
            msg.setText(
                "Hola " + user.getNombre() + ",\n\n" +
                "Tu cuenta en PayFlow ha sido creada correctamente.\n" +
                "Ya puedes gestionar tus transacciones y operar con criptomonedas.\n\n" +
                "El equipo de PayFlow"
            );
            mailSender.send(msg);
        } catch (Exception ex) {
            log.warn("No se pudo enviar email de bienvenida a {}: {}", user.getEmail(), ex.getMessage());
        }
    }

    private String generateTempPassword(int length) {
        SecureRandom rng = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(CHARS.charAt(rng.nextInt(CHARS.length())));
        return sb.toString();
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
