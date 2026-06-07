package com.payflow.auth.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.PaymentLink;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.PaymentLinkCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Implementación real del acceso a Stripe. Aísla las llamadas a la librería de Stripe en un solo sitio
// (patrón Gateway), de modo que el resto del código no dependa directamente de la API de Stripe.
@Component
public class StripeGatewayImpl implements StripeGateway {

    // Crea un cliente en Stripe (Customer) y devuelve su id, que guardamos asociado al usuario.
    @Override
    public String createCustomer(String email, String name) throws StripeException {
        return Customer.create(
                CustomerCreateParams.builder()
                        .setEmail(email)
                        .setName(name)
                        .build()
        ).getId();
    }

    // Crea un Payment Link de Stripe para el plan y devuelve la URL a la que redirigir al usuario.
    @Override
    public String createCheckoutSessionUrl(
            String customerId, String priceId,
            String successUrl, String cancelUrl,
            Map<String, String> metadata) throws StripeException {

        // Líneas del pago: aquí, una sola (el precio del plan) con cantidad 1.
        List<PaymentLinkCreateParams.LineItem> lineItems = new ArrayList<>();
        lineItems.add(PaymentLinkCreateParams.LineItem.builder()
                .setPrice(priceId)
                .setQuantity(1L)
                .build());

        PaymentLinkCreateParams.Builder builder = PaymentLinkCreateParams.builder()
                .addAllLineItem(lineItems)
                // Al completar el pago, Stripe redirige de vuelta a la app.
                // El token {CHECKOUT_SESSION_ID} lo sustituye Stripe por el id real
                // de la sesión (cs_...), que el frontend usa para llamar a /confirm.
                .setAfterCompletion(
                        PaymentLinkCreateParams.AfterCompletion.builder()
                                .setType(PaymentLinkCreateParams.AfterCompletion.Type.REDIRECT)
                                .setRedirect(
                                        PaymentLinkCreateParams.AfterCompletion.Redirect.builder()
                                                .setUrl(successUrl)
                                                .build())
                                .build());

        if (metadata != null) {
            metadata.forEach(builder::putMetadata);
        }

        PaymentLink link = PaymentLink.create(builder.build());
        return link.getUrl();
    }

    // Recupera los datos de una sesión de pago ya creada (estado, suscripción, cliente, metadatos).
    // El servicio lo usa al confirmar el pago para comprobar que realmente se cobró.
    @Override
    public StripeSessionData retrieveSession(String sessionId) throws StripeException {
        Session s = Session.retrieve(sessionId);
        return new StripeSessionData(
                s.getUrl(),
                s.getPaymentStatus(),
                s.getSubscription(),
                s.getCustomer(),
                s.getMetadata()
        );
    }
}
