package com.payflow.transaction.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.payflow.transaction.dto.TransactionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

// Publicador de eventos: envía cada transacción creada a una cola de mensajería (IBM MQ vía JMS).
// Es comunicación asíncrona entre microservicios: el servicio publica y sigue, sin esperar respuesta.
@Component
public class TransactionPublisher {

    private static final Logger log = LoggerFactory.getLogger(TransactionPublisher.class);
    private static final String QUEUE = "TRANSACTION.CREATED"; // Nombre de la cola de destino.

    private final JmsTemplate jmsTemplate;   // Plantilla de Spring para enviar mensajes JMS.
    private final ObjectMapper objectMapper; // Convierte el objeto Java a JSON.

    public TransactionPublisher(JmsTemplate jmsTemplate, ObjectMapper objectMapper) {
        this.jmsTemplate  = jmsTemplate;
        this.objectMapper = objectMapper;
    }

    // Serializa la transacción a JSON y la deja en la cola. Si falla, solo se registra (no rompe el alta).
    public void publish(TransactionResponse transaction) {
        try {
            String json = objectMapper.writeValueAsString(transaction);
            jmsTemplate.convertAndSend(QUEUE, json);
        } catch (Exception e) {
            log.error("No se pudo publicar la transacción {} en MQ: {}", transaction.getId(), e.getMessage());
        }
    }
}
