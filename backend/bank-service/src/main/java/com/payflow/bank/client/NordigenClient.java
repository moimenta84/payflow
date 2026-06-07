package com.payflow.bank.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// Cliente del API de Nordigen/GoCardless: el proveedor de Open Banking (PSD2) que conecta con bancos reales.
// Tiene un "modo demo": si las credenciales son "demo", devuelve datos falsos sin llamar a la API real.
// Esto permite enseñar el flujo completo en la defensa sin necesitar un banco de verdad.
@Component
public class NordigenClient {

    private static final Logger log = LoggerFactory.getLogger(NordigenClient.class);

    @Value("${nordigen.base-url}")
    private String baseUrl;

    @Value("${nordigen.secret-id}")
    private String secretId;

    @Value("${nordigen.secret-key}")
    private String secretKey;

    private final WebClient webClient;
    private String cachedToken;            // Token de acceso cacheado para no pedirlo en cada llamada.
    private LocalDateTime tokenExpiry;     // Momento en que ese token caduca.

    public NordigenClient(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    // Indica si estamos en modo demo (sin banco real). Cada método devuelve datos simulados si es así.
    public boolean isDemoMode() {
        return "demo".equals(secretId);
    }

    // Obtiene un token de acceso de Nordigen, reutilizando el cacheado mientras siga siendo válido.
    @SuppressWarnings("unchecked")
    public String getAccessToken() {
        if (isDemoMode()) return "demo-token";
        if (cachedToken != null && LocalDateTime.now().isBefore(tokenExpiry)) return cachedToken;

        Map<String, String> body = Map.of("secret_id", secretId, "secret_key", secretKey);
        Map<?, ?> response = webClient.post()
                .uri(baseUrl + "/token/new/")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null) throw new RuntimeException("No se pudo obtener token de Nordigen");
        cachedToken = (String) response.get("access");
        long expires = ((Number) response.get("access_expires")).longValue();
        tokenExpiry = LocalDateTime.now().plusSeconds(expires - 60);
        return cachedToken;
    }

    // Lista los bancos disponibles en España. En demo, una lista fija de bancos conocidos.
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getInstitutions() {
        if (isDemoMode()) {
            return List.of(
                Map.of("id", "SANDBOXFINANCE_SFIN0000", "name", "Sandbox Finance (Demo)", "logo", ""),
                Map.of("id", "SANTANDER_ES", "name", "Santander (Demo)", "logo", ""),
                Map.of("id", "BBVA_BBVAESMM", "name", "BBVA (Demo)", "logo", ""),
                Map.of("id", "CAIXABANK_CAIXESBB", "name", "CaixaBank (Demo)", "logo", ""),
                Map.of("id", "ING_INGDESM", "name", "ING (Demo)", "logo", "")
            );
        }
        String token = getAccessToken();
        return webClient.get()
                .uri(baseUrl + "/institutions/?country=es")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList()
                .block()
                .stream()
                .map(m -> (Map<String, Object>) m)
                .toList();
    }

    // Crea una "requisition": la solicitud de consentimiento que genera el enlace para autorizar en el banco.
    @SuppressWarnings("unchecked")
    public Map<String, Object> createRequisition(String institutionId, String redirectUrl) {
        if (isDemoMode()) {
            String link = (redirectUrl != null && !redirectUrl.isBlank())
                ? redirectUrl
                : "http://localhost:5173/banco?connected=true";
            return Map.of(
                "id", "demo-req-" + System.currentTimeMillis(),
                "link", link
            );
        }
        String token = getAccessToken();
        Map<String, String> body = Map.of(
            "redirect", redirectUrl,
            "institution_id", institutionId,
            "reference", "payflow-" + System.currentTimeMillis()
        );
        return (Map<String, Object>) webClient.post()
                .uri(baseUrl + "/requisitions/")
                .header("Authorization", "Bearer " + token)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    // Consulta el estado de una requisition (LN = vinculada) y las cuentas asociadas tras autorizar.
    @SuppressWarnings("unchecked")
    public Map<String, Object> getRequisition(String requisitionId) {
        if (isDemoMode()) {
            return Map.of(
                "id", requisitionId,
                "status", "LN",
                "accounts", List.of("demo-account-001")
            );
        }
        String token = getAccessToken();
        return (Map<String, Object>) webClient.get()
                .uri(baseUrl + "/requisitions/" + requisitionId + "/")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    // Descarga los movimientos de una cuenta. En real, vienen anidados en transactions.booked.
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAccountTransactions(String accountId) {
        if (isDemoMode()) {
            return List.of(
                Map.of("transactionId", "t001",
                       "transactionAmount", Map.of("amount", "-45.50", "currency", "EUR"),
                       "remittanceInformationUnstructured", "Supermercado Mercadona",
                       "bookingDate", "2026-05-24"),
                Map.of("transactionId", "t002",
                       "transactionAmount", Map.of("amount", "1200.00", "currency", "EUR"),
                       "remittanceInformationUnstructured", "Nomina Mayo 2026",
                       "bookingDate", "2026-05-20"),
                Map.of("transactionId", "t003",
                       "transactionAmount", Map.of("amount", "-89.99", "currency", "EUR"),
                       "remittanceInformationUnstructured", "Suscripciones digitales",
                       "bookingDate", "2026-05-18"),
                Map.of("transactionId", "t004",
                       "transactionAmount", Map.of("amount", "-320.00", "currency", "EUR"),
                       "remittanceInformationUnstructured", "Alquiler piso",
                       "bookingDate", "2026-05-01"),
                Map.of("transactionId", "t005",
                       "transactionAmount", Map.of("amount", "250.00", "currency", "EUR"),
                       "remittanceInformationUnstructured", "Transferencia recibida",
                       "bookingDate", "2026-05-15")
            );
        }
        String token = getAccessToken();
        Map<?, ?> response = webClient.get()
                .uri(baseUrl + "/accounts/" + accountId + "/transactions/")
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
        if (response == null) return List.of();
        Map<?, ?> transactions = (Map<?, ?>) response.get("transactions");
        if (transactions == null) return List.of();
        return ((List<?>) transactions.get("booked")).stream()
                .map(m -> (Map<String, Object>) m)
                .toList();
    }
}
