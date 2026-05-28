package com.payflow.auth.stripe;

import com.stripe.exception.StripeException;

import java.util.Map;

// Abstracción sobre el SDK de Stripe. Devuelve tipos propios (no clases del SDK)
// para que los tests puedan usar Mockito sin restricciones de módulos de Java 17+.
public interface StripeGateway {

    // Crea un Customer en Stripe y devuelve su ID (cus_xxx)
    String createCustomer(String email, String name) throws StripeException;

    // Crea una sesión de Checkout y devuelve la URL hosted de Stripe
    String createCheckoutSessionUrl(
            String customerId,
            String priceId,
            String successUrl,
            String cancelUrl,
            Map<String, String> metadata
    ) throws StripeException;

    // Recupera los datos relevantes de una sesión de Checkout por su ID
    StripeSessionData retrieveSession(String sessionId) throws StripeException;
}
