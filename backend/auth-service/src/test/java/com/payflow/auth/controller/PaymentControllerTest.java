package com.payflow.auth.controller;

import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.entity.UserEntity;
import com.payflow.auth.service.StripeOperations;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private StripeOperations stripeService;

    @InjectMocks
    private PaymentController paymentController;

    // ── createCheckoutSession ────────────────────────────────────────────

    @Test
    void createCheckoutSession_returnsUrlIn200() {
        when(stripeService.createCheckoutSession("user-1", "autonomos"))
                .thenReturn("https://checkout.stripe.com/pay/cs_test");

        ResponseEntity<Map<String, String>> response =
                paymentController.createCheckoutSession("user-1", Map.of("plan", "autonomos"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).containsEntry("url", "https://checkout.stripe.com/pay/cs_test");
    }

    @Test
    void createCheckoutSession_passesUserIdAndPlanToService() {
        when(stripeService.createCheckoutSession("user-abc", "autonomos"))
                .thenReturn("https://checkout.stripe.com/pay/cs_abc");

        paymentController.createCheckoutSession("user-abc", Map.of("plan", "autonomos"));

        verify(stripeService).createCheckoutSession("user-abc", "autonomos");
    }

    @Test
    void createCheckoutSession_propagatesServiceException() {
        when(stripeService.createCheckoutSession(any(), any()))
                .thenThrow(new RuntimeException("Plan no válido para pago: free"));

        assertThatThrownBy(() ->
                paymentController.createCheckoutSession("user-1", Map.of("plan", "free")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Plan no válido para pago: free");
    }

    // ── confirm ──────────────────────────────────────────────────────────

    @Test
    void confirm_returnsActivatedUserIn200() {
        UserEntity entity = new UserEntity();
        entity.setEmail("carlos@payflow.com");
        entity.setNombre("Carlos");
        entity.setApellido("López");
        entity.setRol(UserEntity.Rol.USER);
        entity.setPlan(UserEntity.Plan.AUTONOMOS);
        ReflectionTestUtils.setField(entity, "id", "user-1");

        UserResponse mockUser = new UserResponse(entity);
        when(stripeService.confirmSession("user-1", "cs_test_paid")).thenReturn(mockUser);

        ResponseEntity<UserResponse> response =
                paymentController.confirm("user-1", Map.of("sessionId", "cs_test_paid"));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody().getPlan()).isEqualTo("AUTONOMOS");
    }

    @Test
    void confirm_passesUserIdAndSessionIdToService() {
        UserEntity entity = new UserEntity();
        entity.setEmail("x@x.com");
        entity.setNombre("X");
        entity.setRol(UserEntity.Rol.USER);
        entity.setPlan(UserEntity.Plan.AUTONOMOS);
        ReflectionTestUtils.setField(entity, "id", "user-2");

        when(stripeService.confirmSession("user-2", "cs_xyz"))
                .thenReturn(new UserResponse(entity));

        paymentController.confirm("user-2", Map.of("sessionId", "cs_xyz"));

        verify(stripeService).confirmSession("user-2", "cs_xyz");
    }

    @Test
    void confirm_propagatesSecurityException() {
        when(stripeService.confirmSession(any(), any()))
                .thenThrow(new RuntimeException("La sesión de pago no pertenece a este usuario"));

        assertThatThrownBy(() ->
                paymentController.confirm("user-1", Map.of("sessionId", "cs_bad")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("La sesión de pago no pertenece a este usuario");
    }

    @Test
    void confirm_propagatesUnpaidException() {
        when(stripeService.confirmSession(any(), any()))
                .thenThrow(new RuntimeException("El pago aún no está confirmado"));

        assertThatThrownBy(() ->
                paymentController.confirm("user-1", Map.of("sessionId", "cs_unpaid")))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("El pago aún no está confirmado");
    }
}
