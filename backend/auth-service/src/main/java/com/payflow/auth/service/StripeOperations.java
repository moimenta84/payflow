package com.payflow.auth.service;

import com.payflow.auth.dto.UserResponse;

// Interfaz que expone los casos de uso de Stripe al resto de la aplicación.
// Permite testear PaymentController con Mockito sin depender de la clase concreta.
public interface StripeOperations {
    String createCheckoutSession(String userId, String planParam);
    UserResponse confirmSession(String userId, String sessionId);
}
