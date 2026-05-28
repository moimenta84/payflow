package com.payflow.auth.service;

import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.entity.UserEntity;
import com.payflow.auth.repository.UserRepository;
import com.payflow.auth.stripe.StripeGateway;
import com.payflow.auth.stripe.StripeSessionData;
import com.stripe.exception.StripeException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StripeServiceTest {

    // Sólo mockeamos interfaces y clases propias — ninguna clase del SDK de Stripe.
    // Esto garantiza compatibilidad con Java 17+/21+/25 sin flags --add-opens extra.
    @Mock private UserRepository userRepository;
    @Mock private StripeGateway  stripeGateway;

    @InjectMocks
    private StripeService stripeService;

    private UserEntity user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(stripeService, "stripeSecretKey",  "sk_test_fake");
        ReflectionTestUtils.setField(stripeService, "priceAutonomos",   "price_autonomos_test");
        ReflectionTestUtils.setField(stripeService, "frontendUrl",      "http://localhost:5173");
        stripeService.init();

        user = new UserEntity();
        user.setEmail("carlos@payflow.com");
        user.setNombre("Carlos");
        user.setApellido("López");
        user.setRol(UserEntity.Rol.USER);
        ReflectionTestUtils.setField(user, "id", "user-carlos-uuid");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  createCheckoutSession
    // ═══════════════════════════════════════════════════════════════════

    @Test
    void createCheckoutSession_newCustomer_createsCustomerAndReturnsUrl() throws StripeException {
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stripeGateway.createCustomer("carlos@payflow.com", "Carlos"))
                .thenReturn("cus_new_test");
        when(stripeGateway.createCheckoutSessionUrl(eq("cus_new_test"), any(), any(), any(), any()))
                .thenReturn("https://checkout.stripe.com/pay/cs_new");

        String url = stripeService.createCheckoutSession("user-carlos-uuid", "autonomos");

        assertThat(url).isEqualTo("https://checkout.stripe.com/pay/cs_new");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStripeCustomerId()).isEqualTo("cus_new_test");
    }

    @Test
    void createCheckoutSession_existingCustomer_skipsCustomerCreate() throws StripeException {
        user.setStripeCustomerId("cus_already_exists");
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));
        when(stripeGateway.createCheckoutSessionUrl(eq("cus_already_exists"), any(), any(), any(), any()))
                .thenReturn("https://checkout.stripe.com/pay/cs_existing");

        String url = stripeService.createCheckoutSession("user-carlos-uuid", "autonomos");

        assertThat(url).isEqualTo("https://checkout.stripe.com/pay/cs_existing");
        verify(stripeGateway, never()).createCustomer(any(), any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void createCheckoutSession_passesCorrectedPriceAndMetadataToGateway() throws StripeException {
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stripeGateway.createCustomer(any(), any())).thenReturn("cus_meta");

        ArgumentCaptor<String>              priceCaptor    = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Map<String, String>> metaCaptor     = ArgumentCaptor.forClass(Map.class);
        when(stripeGateway.createCheckoutSessionUrl(
                any(), priceCaptor.capture(), any(), any(), metaCaptor.capture()))
                .thenReturn("https://checkout.stripe.com/cs_meta");

        stripeService.createCheckoutSession("user-carlos-uuid", "autonomos");

        assertThat(priceCaptor.getValue()).isEqualTo("price_autonomos_test");
        assertThat(metaCaptor.getValue())
                .containsEntry("userId", "user-carlos-uuid")
                .containsEntry("plan",   "autonomos");
    }

    @Test
    void createCheckoutSession_successUrlContainsSessionIdPlaceholder() throws StripeException {
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stripeGateway.createCustomer(any(), any())).thenReturn("cus_url");

        ArgumentCaptor<String> successUrlCaptor = ArgumentCaptor.forClass(String.class);
        when(stripeGateway.createCheckoutSessionUrl(
                any(), any(), successUrlCaptor.capture(), any(), any()))
                .thenReturn("https://checkout.stripe.com/cs_url");

        stripeService.createCheckoutSession("user-carlos-uuid", "autonomos");

        assertThat(successUrlCaptor.getValue())
                .startsWith("http://localhost:5173/payment-success")
                .contains("{CHECKOUT_SESSION_ID}");
    }

    @Test
    void createCheckoutSession_invalidPlan_throwsBeforeCallingStripe() {
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> stripeService.createCheckoutSession("user-carlos-uuid", "plus"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Plan no válido para pago: plus");

        verifyNoInteractions(stripeGateway);
    }

    @Test
    void createCheckoutSession_nullPlan_throwsBeforeCallingStripe() {
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> stripeService.createCheckoutSession("user-carlos-uuid", null))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Plan no válido para pago");

        verifyNoInteractions(stripeGateway);
    }

    @Test
    void createCheckoutSession_userNotFound_throwsImmediately() {
        when(userRepository.findById("ghost-uuid")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stripeService.createCheckoutSession("ghost-uuid", "autonomos"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Usuario no encontrado");

        verifyNoInteractions(stripeGateway);
    }

    @Test
    void createCheckoutSession_stripeException_wrapsWithMessage() throws StripeException {
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stripeGateway.createCustomer(any(), any())).thenReturn("cus_fail");
        when(stripeGateway.createCheckoutSessionUrl(any(), any(), any(), any(), any()))
                .thenThrow(new StripeException("stripe error", null, null, 400) {});

        assertThatThrownBy(() -> stripeService.createCheckoutSession("user-carlos-uuid", "autonomos"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Error al crear la sesión de pago");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  confirmSession
    // ═══════════════════════════════════════════════════════════════════

    @Test
    void confirmSession_paidSession_activatesPlanAndPersistsStripeIds() throws StripeException {
        when(userRepository.findById("user-carlos-uuid")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(stripeGateway.retrieveSession("cs_paid")).thenReturn(new StripeSessionData(
                "https://checkout.stripe.com/cs_paid",
                "paid",
                "sub_test_abc",
                "cus_test_123",
                Map.of("userId", "user-carlos-uuid", "plan", "autonomos")
        ));

        UserResponse result = stripeService.confirmSession("user-carlos-uuid", "cs_paid");

        assertThat(result.getPlan()).isEqualTo("AUTONOMOS");

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPlan()).isEqualTo(UserEntity.Plan.AUTONOMOS);
        assertThat(captor.getValue().getStripeSubscriptionId()).isEqualTo("sub_test_abc");
        assertThat(captor.getValue().getStripeCustomerId()).isEqualTo("cus_test_123");
    }

    @Test
    void confirmSession_wrongUserId_throwsAndNeverSaves() throws StripeException {
        when(stripeGateway.retrieveSession("cs_other")).thenReturn(new StripeSessionData(
                null, "paid", null, null,
                Map.of("userId", "user-otro-uuid", "plan", "autonomos")
        ));

        assertThatThrownBy(() -> stripeService.confirmSession("user-carlos-uuid", "cs_other"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("La sesión de pago no pertenece a este usuario");

        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmSession_nullMetadata_throwsSecurityException() throws StripeException {
        when(stripeGateway.retrieveSession("cs_null_meta")).thenReturn(
                new StripeSessionData(null, "paid", null, null, null));

        assertThatThrownBy(() -> stripeService.confirmSession("user-carlos-uuid", "cs_null_meta"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("La sesión de pago no pertenece a este usuario");
    }

    @Test
    void confirmSession_unpaidSession_throwsWithoutActivatingPlan() throws StripeException {
        when(stripeGateway.retrieveSession("cs_unpaid")).thenReturn(new StripeSessionData(
                null, "unpaid", null, null,
                Map.of("userId", "user-carlos-uuid", "plan", "autonomos")
        ));

        assertThatThrownBy(() -> stripeService.confirmSession("user-carlos-uuid", "cs_unpaid"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("El pago aún no está confirmado");

        verify(userRepository, never()).save(any());
    }

    @Test
    void confirmSession_noPaymentRequired_throwsWithoutActivatingPlan() throws StripeException {
        when(stripeGateway.retrieveSession("cs_open")).thenReturn(new StripeSessionData(
                null, "no_payment_required", null, null,
                Map.of("userId", "user-carlos-uuid", "plan", "autonomos")
        ));

        assertThatThrownBy(() -> stripeService.confirmSession("user-carlos-uuid", "cs_open"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("El pago aún no está confirmado");
    }

    @Test
    void confirmSession_userNotFound_throwsAfterSessionCheck() throws StripeException {
        when(stripeGateway.retrieveSession("cs_ghost")).thenReturn(new StripeSessionData(
                null, "paid", null, null,
                Map.of("userId", "ghost-uuid", "plan", "autonomos")
        ));
        when(userRepository.findById("ghost-uuid")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stripeService.confirmSession("ghost-uuid", "cs_ghost"))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Usuario no encontrado");
    }

    @Test
    void confirmSession_stripeException_wrapsWithMessage() throws StripeException {
        when(stripeGateway.retrieveSession("cs_error"))
                .thenThrow(new StripeException("stripe error", null, null, 400) {});

        assertThatThrownBy(() -> stripeService.confirmSession("user-carlos-uuid", "cs_error"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Error al confirmar el pago");
    }
}
