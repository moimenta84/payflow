package com.payflow.auth.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.stereotype.Component;

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

        SessionCreateParams.Builder builder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setCustomer(customerId)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setPrice(priceId)
                        .setQuantity(1L)
                        .build());
        if (metadata != null) metadata.forEach(builder::putMetadata);
        return Session.create(builder.build()).getUrl();
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
