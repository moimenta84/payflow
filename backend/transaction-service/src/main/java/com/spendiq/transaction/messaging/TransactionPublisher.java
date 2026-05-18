package com.spendiq.transaction.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spendiq.transaction.dto.TransactionResponse;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

@Component
public class TransactionPublisher {

    private static final String QUEUE = "TRANSACTION.CREATED";

    private final JmsTemplate jmsTemplate;
    private final ObjectMapper objectMapper;

    public TransactionPublisher(JmsTemplate jmsTemplate, ObjectMapper objectMapper) {
        this.jmsTemplate  = jmsTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(TransactionResponse transaction) {
        try {
            String json = objectMapper.writeValueAsString(transaction);
            jmsTemplate.convertAndSend(QUEUE, json);
        } catch (Exception e) {
            // El fallo de mensajería no debe bloquear la respuesta al usuario
            throw new RuntimeException("Error al publicar la transacción en la cola", e);
        }
    }
}
