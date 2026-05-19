package com.spendiq.transaction.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spendiq.transaction.dto.TransactionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

@Component
public class TransactionPublisher {

    private static final Logger log = LoggerFactory.getLogger(TransactionPublisher.class);
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
            log.error("No se pudo publicar la transacción {} en MQ: {}", transaction.getId(), e.getMessage());
        }
    }
}
