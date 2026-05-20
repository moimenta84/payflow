package com.payflow.trading.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class TransactionConsumer {

    private static final Logger log = LoggerFactory.getLogger(TransactionConsumer.class);

    private final ObjectMapper objectMapper;

    public TransactionConsumer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    // Recibe eventos de transaction-service para tener visibilidad del flujo de dinero.
    // El balance real vive en transaction-service — aquí solo registramos el evento.
    @JmsListener(destination = "TRANSACTION.CREATED")
    public void onTransactionCreated(String message) {
        try {
            Map<String, Object> payload = objectMapper.readValue(message, Map.class);
            log.info("Transacción recibida: userId={} tipo={} cantidad={}",
                    payload.get("userId"), payload.get("tipo"), payload.get("cantidad"));
        } catch (Exception e) {
            log.error("Error procesando TRANSACTION.CREATED: {}", e.getMessage());
        }
    }
}
