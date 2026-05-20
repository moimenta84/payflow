package com.payflow.price.service;

import com.payflow.price.dto.AlertRequest;
import com.payflow.price.dto.AlertResponse;
import com.payflow.price.entity.PriceAlertEntity;
import com.payflow.price.entity.PriceAlertEntity.Direction;
import com.payflow.price.repository.PriceAlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final PriceAlertRepository alertRepository;
    private final JavaMailSender        mailSender;

    public AlertService(PriceAlertRepository alertRepository, JavaMailSender mailSender) {
        this.alertRepository = alertRepository;
        this.mailSender      = mailSender;
    }

    public AlertResponse create(String userId, String userEmail, AlertRequest request) {
        PriceAlertEntity alert = new PriceAlertEntity();
        alert.setUserId(userId);
        alert.setUserEmail(userEmail);
        alert.setAsset(request.getAsset().toLowerCase());
        alert.setTargetPrice(request.getTargetPrice());
        alert.setDirection(request.getDirection());
        log.info("Nueva alerta: {} {} {} para usuario {}", request.getAsset(),
                request.getDirection(), request.getTargetPrice(), userId);
        return new AlertResponse(alertRepository.save(alert));
    }

    public List<AlertResponse> getAlerts(String userId) {
        return alertRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(AlertResponse::new).toList();
    }

    public void deleteAlert(String userId, String alertId) {
        PriceAlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alerta no encontrada"));
        if (!alert.getUserId().equals(userId)) {
            throw new RuntimeException("No tienes permiso para eliminar esta alerta");
        }
        alertRepository.delete(alert);
    }

    // Llamado desde el scheduler tras cada actualización de precios
    public void checkAlerts(String asset, double currentPrice) {
        List<PriceAlertEntity> pending = alertRepository.findByTriggeredFalseAndAsset(asset);

        for (PriceAlertEntity alert : pending) {
            boolean hit = (alert.getDirection() == Direction.ABOVE && currentPrice >= alert.getTargetPrice())
                       || (alert.getDirection() == Direction.BELOW && currentPrice <= alert.getTargetPrice());

            if (hit) {
                alert.setTriggered(true);
                alert.setTriggeredAt(LocalDateTime.now());
                alertRepository.save(alert);
                log.info("Alerta disparada: {} alcanzó {} (objetivo: {})",
                        asset, currentPrice, alert.getTargetPrice());
                sendEmail(alert, currentPrice);
            }
        }
    }

    private void sendEmail(PriceAlertEntity alert, double currentPrice) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(alert.getUserEmail());
            msg.setSubject(String.format("PayFlow — Alerta de precio: %s", alert.getAsset().toUpperCase()));
            msg.setText(String.format(
                    "Hola,\n\nTu alerta de precio ha sido activada.\n\n" +
                    "Activo: %s\n" +
                    "Precio actual: %.2f $\n" +
                    "Tu objetivo (%s): %.2f $\n\n" +
                    "— El equipo de PayFlow",
                    alert.getAsset().toUpperCase(),
                    currentPrice,
                    alert.getDirection().name(),
                    alert.getTargetPrice()
            ));
            mailSender.send(msg);
            log.info("Email de alerta enviado a {}", alert.getUserEmail());
        } catch (Exception e) {
            log.error("Error enviando email de alerta a {}: {}", alert.getUserEmail(), e.getMessage());
        }
    }
}
