package com.payflow.auth.service;

import com.payflow.auth.dto.AuthResponse;
import com.payflow.auth.dto.LoginRequest;
import com.payflow.auth.dto.RegisterRequest;
import com.payflow.auth.dto.RolRequest;
import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.entity.UserEntity;
import com.payflow.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private AuthService authService;

    private UserEntity existingUser;

    @BeforeEach
    void setUp() {
        // JWT secret must be >= 256 bits (32 chars) for HMAC-SHA256
        ReflectionTestUtils.setField(authService, "jwtSecret",
                "test-secret-key-32-chars-minimum!!");
        ReflectionTestUtils.setField(authService, "jwtExpiration", 3_600_000L);
        // Empty mailFrom → skip email sending
        ReflectionTestUtils.setField(authService, "mailFrom", "");

        existingUser = new UserEntity();
        existingUser.setEmail("alice@payflow.com");
        existingUser.setPassword("$2a$10$encodedHash");
        existingUser.setNombre("Alice");
        existingUser.setApellido("Smith");
        existingUser.setSaldoInicial(0.0);
        existingUser.setRol(UserEntity.Rol.USER);
        // Simulate Hibernate-generated UUID
        ReflectionTestUtils.setField(existingUser, "id", "user-alice-uuid");
    }

    // ─── register ───────────────────────────────────────────────────────

    @Test
    void register_success_returnsJwtAndUserResponse() {
        when(userRepository.existsByEmail("alice@payflow.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("$2a$10$encodedHash");
        when(userRepository.save(any())).thenReturn(existingUser);

        RegisterRequest req = buildRegisterRequest("Alice", "Smith", "alice@payflow.com", "password123");

        AuthResponse response = authService.register(req);

        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getUser().getEmail()).isEqualTo("alice@payflow.com");
        assertThat(response.getUser().getNombre()).isEqualTo("Alice");
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        when(userRepository.existsByEmail("alice@payflow.com")).thenReturn(true);

        RegisterRequest req = buildRegisterRequest("Alice", "Smith", "alice@payflow.com", "pass1234");

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("El email ya está registrado");

        verify(userRepository, never()).save(any());
    }

    @Test
    void register_assignsUserRoleByDefault() {
        when(userRepository.existsByEmail("alice@payflow.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(userRepository.save(any())).thenReturn(existingUser);

        authService.register(buildRegisterRequest("Alice", "Smith", "alice@payflow.com", "pass1234"));

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getRol()).isEqualTo(UserEntity.Rol.USER);
    }

    @Test
    void register_encryptsPassword() {
        when(userRepository.existsByEmail("alice@payflow.com")).thenReturn(false);
        when(passwordEncoder.encode("plain-password")).thenReturn("bcrypt-hash");
        when(userRepository.save(any())).thenReturn(existingUser);

        authService.register(buildRegisterRequest("Alice", "Smith", "alice@payflow.com", "plain-password"));

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPassword()).isEqualTo("bcrypt-hash");
    }

    // ─── login ──────────────────────────────────────────────────────────

    @Test
    void login_success_returnsJwtAndUserResponse() {
        when(userRepository.findByEmail("alice@payflow.com")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("password123", "$2a$10$encodedHash")).thenReturn(true);

        LoginRequest req = new LoginRequest();
        req.setEmail("alice@payflow.com");
        req.setPassword("password123");

        AuthResponse response = authService.login(req);

        assertThat(response.getToken()).isNotBlank();
        assertThat(response.getUser().getEmail()).isEqualTo("alice@payflow.com");
    }

    @Test
    void login_throwsWhenEmailNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        LoginRequest req = new LoginRequest();
        req.setEmail("unknown@test.com");
        req.setPassword("anything");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Credenciales incorrectas");
    }

    @Test
    void login_throwsWhenPasswordWrong_sameMessageAsEmailNotFound() {
        when(userRepository.findByEmail("alice@payflow.com")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("wrong-pass", "$2a$10$encodedHash")).thenReturn(false);

        LoginRequest req = new LoginRequest();
        req.setEmail("alice@payflow.com");
        req.setPassword("wrong-pass");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Credenciales incorrectas");
    }

    // ─── getUser ────────────────────────────────────────────────────────

    @Test
    void getUser_returnsUserResponse() {
        when(userRepository.findById("user-alice-uuid")).thenReturn(Optional.of(existingUser));

        UserResponse response = authService.getUser("user-alice-uuid");

        assertThat(response.getEmail()).isEqualTo("alice@payflow.com");
        assertThat(response.getNombre()).isEqualTo("Alice");
    }

    @Test
    void getUser_throwsWhenNotFound() {
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getUser("nonexistent"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Usuario no encontrado");
    }

    // ─── updateUser ─────────────────────────────────────────────────────

    @Test
    void updateUser_updatesNombreApellidoSaldoInicial() {
        when(userRepository.findById("user-alice-uuid")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RegisterRequest req = new RegisterRequest();
        req.setNombre("Alicia");
        req.setApellido("González");
        req.setSaldoInicial(500.0);

        UserResponse result = authService.updateUser("user-alice-uuid", req);

        assertThat(result.getNombre()).isEqualTo("Alicia");
        assertThat(result.getApellido()).isEqualTo("González");
        assertThat(result.getSaldoInicial()).isEqualTo(500.0);
    }

    @Test
    void updateUser_doesNotChangeEmailOrRol() {
        when(userRepository.findById("user-alice-uuid")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RegisterRequest req = new RegisterRequest();
        req.setNombre("Alicia");
        // email and rol fields intentionally not set

        authService.updateUser("user-alice-uuid", req);

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("alice@payflow.com");
        assertThat(captor.getValue().getRol()).isEqualTo(UserEntity.Rol.USER);
    }

    // ─── deleteUser ─────────────────────────────────────────────────────

    @Test
    void deleteUser_deletesExistingUser() {
        when(userRepository.existsById("user-alice-uuid")).thenReturn(true);

        authService.deleteUser("user-alice-uuid");

        verify(userRepository).deleteById("user-alice-uuid");
    }

    @Test
    void deleteUser_throwsWhenNotFound() {
        when(userRepository.existsById("ghost")).thenReturn(false);

        assertThatThrownBy(() -> authService.deleteUser("ghost"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Usuario no encontrado");

        verify(userRepository, never()).deleteById(any());
    }

    // ─── changeRol ──────────────────────────────────────────────────────

    @Test
    void changeRol_updatesUserRole() {
        when(userRepository.findById("user-alice-uuid")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RolRequest req = new RolRequest();
        req.setRol(UserEntity.Rol.ADMIN);

        UserResponse result = authService.changeRol("user-alice-uuid", req);

        assertThat(result.getRol()).isEqualTo("ADMIN");
    }

    // ─── resetPassword ──────────────────────────────────────────────────

    @Test
    void resetPassword_doesNothingWhenEmailNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        authService.resetPassword("unknown@test.com");

        verify(userRepository, never()).save(any());
        verify(mailSender, never()).send(any(org.springframework.mail.SimpleMailMessage.class));
    }

    @Test
    void resetPassword_updatesPasswordWhenEmailFound() {
        when(userRepository.findByEmail("alice@payflow.com")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.encode(anyString())).thenReturn("new-bcrypt-hash");
        when(userRepository.save(any())).thenReturn(existingUser);

        authService.resetPassword("alice@payflow.com");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPassword()).isEqualTo("new-bcrypt-hash");
    }

    // ─── getAllUsers ─────────────────────────────────────────────────────

    @Test
    void getAllUsers_returnsAllUsers() {
        when(userRepository.findAll()).thenReturn(List.of(existingUser));

        List<UserResponse> result = authService.getAllUsers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("alice@payflow.com");
    }

    // ─── helpers ────────────────────────────────────────────────────────

    private RegisterRequest buildRegisterRequest(String nombre, String apellido, String email, String password) {
        RegisterRequest req = new RegisterRequest();
        req.setNombre(nombre);
        req.setApellido(apellido);
        req.setEmail(email);
        req.setPassword(password);
        return req;
    }
}
