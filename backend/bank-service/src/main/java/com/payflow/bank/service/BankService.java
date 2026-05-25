package com.payflow.bank.service;

import com.payflow.bank.client.NordigenClient;
import com.payflow.bank.dto.BankConnectionResponse;
import com.payflow.bank.dto.BankTransactionResponse;
import com.payflow.bank.entity.BankConnection;
import com.payflow.bank.entity.BankTransaction;
import com.payflow.bank.repository.BankConnectionRepository;
import com.payflow.bank.repository.BankTransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BankService {

    private final BankConnectionRepository  connectionRepo;
    private final BankTransactionRepository transactionRepo;
    private final NordigenClient            nordigenClient;
    private final RestTemplate              restTemplate;

    @Value("${transaction.service.url}")
    private String transactionServiceUrl;

    public BankService(BankConnectionRepository connectionRepo,
                       BankTransactionRepository transactionRepo,
                       NordigenClient nordigenClient) {
        this.connectionRepo  = connectionRepo;
        this.transactionRepo = transactionRepo;
        this.nordigenClient  = nordigenClient;
        this.restTemplate    = new RestTemplate();
    }

    public BankConnectionResponse iniciarConexion(String userId, String institutionId, String redirectUrl) {
        Map<String, Object> req = nordigenClient.createRequisition(institutionId, redirectUrl);

        BankConnection conn = new BankConnection();
        conn.setUserId(userId);
        conn.setRequisitionId((String) req.get("id"));
        conn.setInstitutionId(institutionId);
        conn.setInstitutionName(institutionId);
        conn.setStatus(BankConnection.Status.PENDING);
        conn.setLink((String) req.get("link"));
        connectionRepo.save(conn);

        return new BankConnectionResponse(conn);
    }

    @Transactional
    public void procesarCallback(String userId, String requisitionId) {
        BankConnection conn = connectionRepo
                .findByUserIdAndRequisitionId(userId, requisitionId)
                .orElseThrow(() -> new RuntimeException("Conexion no encontrada"));

        Map<String, Object> req = nordigenClient.getRequisition(requisitionId);
        String status = (String) req.get("status");
        if ("LN".equals(status)) {
            conn.setStatus(BankConnection.Status.LINKED);
            connectionRepo.save(conn);
        }
    }

    public Optional<BankConnectionResponse> getConexion(String userId) {
        return connectionRepo.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .map(BankConnectionResponse::new);
    }

    @SuppressWarnings("unchecked")
    @Transactional
    public List<BankTransactionResponse> sincronizarTransacciones(String userId) {
        BankConnection conn = connectionRepo
                .findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, BankConnection.Status.LINKED)
                .orElseThrow(() -> new RuntimeException("No tienes una cuenta bancaria vinculada"));

        Map<String, Object> req = nordigenClient.getRequisition(conn.getRequisitionId());
        List<String> accounts = (List<String>) req.get("accounts");

        List<BankTransactionResponse> resultado = new ArrayList<>();
        for (String accountId : accounts) {
            List<Map<String, Object>> rawTxs = nordigenClient.getAccountTransactions(accountId);
            for (Map<String, Object> raw : rawTxs) {
                String externalId = (String) raw.get("transactionId");

                if (transactionRepo.existsByExternalId(externalId)) {
                    transactionRepo.findByExternalId(externalId)
                            .map(BankTransactionResponse::new)
                            .ifPresent(resultado::add);
                    continue;
                }

                Map<String, Object> amountMap = (Map<String, Object>) raw.get("transactionAmount");
                double amountVal  = Double.parseDouble((String) amountMap.get("amount"));
                String currency   = (String) amountMap.get("currency");
                String desc       = (String) raw.getOrDefault(
                        "remittanceInformationUnstructured", "Transaccion bancaria");
                LocalDate date    = LocalDate.parse((String) raw.get("bookingDate"));

                BankTransaction tx = new BankTransaction();
                tx.setUserId(userId);
                tx.setBankConnectionId(conn.getId());
                tx.setExternalId(externalId);
                tx.setAmount(amountVal);
                tx.setCurrency(currency);
                tx.setDescription(desc);
                tx.setBookingDate(date);
                resultado.add(new BankTransactionResponse(transactionRepo.save(tx)));
            }
        }
        return resultado;
    }

    public void importarTransaccion(String userId, String bankTransactionId) {
        BankTransaction tx = transactionRepo.findByIdAndUserId(bankTransactionId, userId)
                .orElseThrow(() -> new RuntimeException("Transaccion no encontrada"));

        if (tx.isImportedToPayflow()) throw new RuntimeException("Ya importada a PayFlow");

        String tipo = tx.getAmount() >= 0 ? "INGRESO" : "GASTO";

        Map<String, Object> body = Map.of(
            "tipo",       tipo,
            "categoria",  "OTROS",
            "descripcion", tx.getDescription(),
            "cantidad",   Math.abs(tx.getAmount()),
            "fecha",      tx.getBookingDate().toString()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-Id", userId);

        try {
            restTemplate.postForObject(
                transactionServiceUrl + "/transactions",
                new HttpEntity<>(body, headers),
                Object.class
            );
            tx.setImportedToPayflow(true);
            transactionRepo.save(tx);
        } catch (Exception e) {
            throw new RuntimeException("Error al importar: " + e.getMessage());
        }
    }

    public void desconectar(String userId) {
        connectionRepo.findFirstByUserIdOrderByCreatedAtDesc(userId).ifPresent(conn -> {
            conn.setStatus(BankConnection.Status.EXPIRED);
            connectionRepo.save(conn);
        });
    }

    public List<Map<String, Object>> getInstituciones() {
        return nordigenClient.getInstitutions();
    }
}
