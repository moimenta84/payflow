package com.payflow.price.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payflow.price.dto.PriceResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

@Component
public class PricePublisher {

    private static final Logger log = LoggerFactory.getLogger(PricePublisher.class);
    private static final String QUEUE = "PRICE.UPDATED";

    private final JmsTemplate  jmsTemplate;
    private final ObjectMapper objectMapper;

    public PricePublisher(JmsTemplate jmsTemplate, ObjectMapper objectMapper) {
        this.jmsTemplate  = jmsTemplate;
        this.objectMapper = objectMapper;
    }

    public void publish(PriceResponse price) {
        try {
            String json = objectMapper.writeValueAsString(price);
            jmsTemplate.convertAndSend(QUEUE, json);
        } catch (Exception e) {
            log.error("No se pudo publicar precio de {} en MQ: {}", price.getAsset(), e.getMessage());
        }
    }
}
