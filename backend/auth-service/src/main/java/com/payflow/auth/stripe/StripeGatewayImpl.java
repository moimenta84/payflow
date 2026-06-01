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

@Component
public class StripeGatewayImpl implements StripeGateway {

    @Override
    public String createCustomer(String email, String name) throws StripeException {
        return Customer.create(
                CustomerCreateParams.builder()
                        .setEmail(email)
                        .setName(name)
                        .build()
        ).getId();
    }

    @Override
    public String createCheckoutSessionUrl(
            String customerId, String priceId,
            String successUrl, String cancelUrl,
            Map<String, String> metadata) throws StripeException {

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
