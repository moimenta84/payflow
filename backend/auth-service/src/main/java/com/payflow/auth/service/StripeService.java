package com.payflow.auth.service;

import com.payflow.auth.dto.UserResponse;
import com.payflow.auth.entity.UserEntity;
import com.payflow.auth.repository.UserRepository;
import com.payflow.auth.stripe.StripeGateway;
import com.payflow.auth.stripe.StripeSessionData;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class StripeService implements StripeOperations {

    private final UserRepository userRepository;
    private final StripeGateway  stripeGateway;

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${stripe.price.autonomos}")
    private String priceAutonomos;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public StripeService(UserRepository userRepository, StripeGateway stripeGateway) {
        this.userRepository = userRepository;
        this.stripeGateway  = stripeGateway;
    }

    @PostConstruct
    void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public String createCheckoutSession(String userId, String planParam) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        String plan = planParam == null ? "" : planParam.toLowerCase();
        if (!"autonomos".equals(plan)) {
            throw new RuntimeException("Plan no válido para pago: " + planParam);
        }

        try {
            String customerId = user.getStripeCustomerId();
            if (customerId == null || customerId.isBlank()) {
                customerId = stripeGateway.createCustomer(user.getEmail(), user.getNombre());
                user.setStripeCustomerId(customerId);
                userRepository.save(user);
            }

            return stripeGateway.createCheckoutSessionUrl(
                    customerId,
                    priceAutonomos,
                    frontendUrl + "/payment-success?session_id={CHECKOUT_SESSION_ID}",
                    frontendUrl + "/payment-cancelled",
                    Map.of("userId", userId, "plan", plan)
            );

        } catch (StripeException e) {
            throw new RuntimeException("Error al crear la sesión de pago: " + e.getMessage(), e);
        }
    }

    public UserResponse confirmSession(String userId, String sessionId) {
        try {
            StripeSessionData data = stripeGateway.retrieveSession(sessionId);

            String sessionUserId = data.metadata() != null
                    ? data.metadata().get("userId") : null;
            if (sessionUserId == null || !sessionUserId.equals(userId)) {
                throw new RuntimeException("La sesión de pago no pertenece a este usuario");
            }

            if (!"paid".equals(data.paymentStatus())) {
                throw new RuntimeException("El pago aún no está confirmado");
            }

            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            user.setPlan(UserEntity.Plan.AUTONOMOS);
            user.setStripeSubscriptionId(data.subscriptionId());
            if (data.customerId() != null) {
                user.setStripeCustomerId(data.customerId());
            }
            userRepository.save(user);

            return new UserResponse(user);

        } catch (StripeException e) {
            throw new RuntimeException("Error al confirmar el pago: " + e.getMessage(), e);
        }
    }
}
