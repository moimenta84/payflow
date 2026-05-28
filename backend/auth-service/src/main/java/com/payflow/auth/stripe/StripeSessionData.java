package com.payflow.auth.stripe;

import java.util.Map;

// DTO propio que desacopla StripeService de los tipos del SDK de Stripe.
// Contiene solo los campos que necesitamos de una Checkout Session.
public record StripeSessionData(
        String url,
        String paymentStatus,
        String subscriptionId,
        String customerId,
        Map<String, String> metadata
) {}
