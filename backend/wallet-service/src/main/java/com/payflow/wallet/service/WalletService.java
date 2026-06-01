package com.payflow.wallet.service;

import com.payflow.wallet.dto.LedgerEntryResponse;
import com.payflow.wallet.dto.SendMoneyRequest;
import com.payflow.wallet.dto.WalletResponse;
import com.payflow.wallet.entity.LedgerEntry;
import com.payflow.wallet.entity.WalletEntity;
import com.payflow.wallet.exception.ApiException;
import com.payflow.wallet.repository.LedgerEntryRepository;
import com.payflow.wallet.repository.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Servicio principal de la wallet digital PayFlow.
 *
 * Implementa el patrón de libro mayor de doble entrada (double-entry ledger):
 * cada transferencia genera dos asientos — un DEBIT en el remitente y un CREDIT
 * en el destinatario — garantizando la integridad contable del sistema.
 *
 * La idempotencia se asegura mediante un correlationId único por operación,
 * evitando duplicados si el cliente reintenta la misma petición.
 */
@Service
public class WalletService {

    /** Saldo inicial otorgado al crear una wallet nueva (bienvenida). */
    private static final double SALDO_INICIAL_BIENVENIDA = 50.0;

    private final WalletRepository walletRepository;
    private final LedgerEntryRepository ledgerRepository;

    public WalletService(WalletRepository walletRepository, LedgerEntryRepository ledgerRepository) {
        this.walletRepository = walletRepository;
        this.ledgerRepository = ledgerRepository;
    }

    /**
     * Devuelve la wallet del usuario; si no existe, la crea con el saldo de bienvenida.
     * El primer acceso de cada usuario provisiona automáticamente su wallet.
     */
    @Transactional
    public WalletResponse getOrCreateWallet(String userId) {
        WalletEntity wallet = walletRepository.findByUserId(userId)
                .orElseGet(() -> crearWalletConBienvenida(userId));
        return new WalletResponse(wallet);
    }

    /**
     * Devuelve el historial de movimientos del usuario, ordenado del más reciente al más antiguo.
     * Cada movimiento incluye el saldo resultante tras la operación (balanceAfter).
     */
    public List<LedgerEntryResponse> getMovements(String userId) {
        WalletEntity wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Wallet no encontrado"));
        return ledgerRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId())
                .stream().map(LedgerEntryResponse::new).toList();
    }

    /**
     * Transfiere dinero entre dos wallets (P2P).
     *
     * Garantías:
     * - Idempotente: si se recibe el mismo idempotencyKey ya procesado, devuelve el estado actual
     *   sin repetir la operación (previene duplicados por retries del cliente).
     * - Atómica: ambas actualizaciones de saldo y los dos asientos del ledger se ejecutan
     *   en la misma transacción; si falla cualquier paso, se revierte todo.
     * - Validación de saldo: lanza excepción con saldo actual si el remitente no tiene fondos.
     *
     * @param fromUserId    ID del usuario que envía el dinero
     * @param req           Datos del envío (destinatario, importe, concepto)
     * @param idempotencyKey Clave opcional para deduplicación; si es null se genera una UUID
     * @return Wallet actualizada del remitente
     */
    @Transactional
    public WalletResponse send(String fromUserId, SendMoneyRequest req, String idempotencyKey) {
        if (fromUserId.equals(req.getToUserId())) {
            throw ApiException.badRequest("No puedes enviarte dinero a ti mismo");
        }

        // Generar correlationId para idempotencia
        String correlation = (idempotencyKey != null && !idempotencyKey.isBlank())
                ? idempotencyKey : UUID.randomUUID().toString();

        // Comprobación de idempotencia: si ya existe un asiento con este correlationId, no repetir
        var existing = ledgerRepository.findFirstByCorrelationIdAndUserId(correlation, fromUserId);
        if (existing.isPresent()) {
            WalletEntity w = walletRepository.findByUserId(fromUserId).orElseThrow();
            return new WalletResponse(w);
        }

        // Obtener o crear wallets (auto-provisioning si es el primer acceso)
        WalletEntity from = walletRepository.findByUserId(fromUserId)
                .orElseGet(() -> crearWalletConBienvenida(fromUserId));
        WalletEntity to = walletRepository.findByUserId(req.getToUserId())
                .orElseGet(() -> crearWalletConBienvenida(req.getToUserId()));

        // Validar saldo suficiente
        if (from.getBalance() < req.getAmount()) {
            throw ApiException.badRequest("Saldo insuficiente: tienes "
                    + String.format("%.2f", from.getBalance()) + " EUR");
        }

        // Actualizar saldos
        from.setBalance(from.getBalance() - req.getAmount());
        to.setBalance(to.getBalance() + req.getAmount());
        walletRepository.save(from);
        walletRepository.save(to);

        String desc = (req.getDescription() == null || req.getDescription().isBlank())
                ? "Envío P2P" : req.getDescription();

        // Registrar los dos asientos del ledger (doble entrada)
        crearAsiento(from, fromUserId, LedgerEntry.Type.DEBIT, req.getAmount(),
                desc, req.getToUserId(), correlation);
        crearAsiento(to, req.getToUserId(), LedgerEntry.Type.CREDIT, req.getAmount(),
                desc, fromUserId, correlation);

        return new WalletResponse(from);
    }

    /**
     * Crea una wallet nueva con el saldo de bienvenida y registra el asiento CREDIT inicial.
     */
    private WalletEntity crearWalletConBienvenida(String userId) {
        WalletEntity w = new WalletEntity();
        w.setUserId(userId);
        w.setBalance(SALDO_INICIAL_BIENVENIDA);
        w.setCurrency("EUR");
        w = walletRepository.save(w);

        // Asiento de bienvenida en el ledger
        LedgerEntry welcome = new LedgerEntry();
        welcome.setWalletId(w.getId());
        welcome.setUserId(userId);
        welcome.setType(LedgerEntry.Type.CREDIT);
        welcome.setAmount(SALDO_INICIAL_BIENVENIDA);
        welcome.setBalanceAfter(SALDO_INICIAL_BIENVENIDA);
        welcome.setCorrelationId("welcome-" + userId);
        welcome.setDescription("Saldo de bienvenida PayFlow");
        ledgerRepository.save(welcome);

        return w;
    }

    /**
     * Crea un asiento contable en el ledger.
     *
     * @param wallet       Wallet a la que pertenece el asiento (para capturar el saldo resultante)
     * @param userId       Propietario del asiento
     * @param type         DEBIT (salida) o CREDIT (entrada)
     * @param amount       Importe de la operación
     * @param desc         Concepto de la operación
     * @param counterparty ID del usuario contraparte (destinatario o remitente)
     * @param correlation  ID de correlación para idempotencia
     */
    private void crearAsiento(WalletEntity wallet, String userId, LedgerEntry.Type type,
                              double amount, String desc, String counterparty, String correlation) {
        LedgerEntry e = new LedgerEntry();
        e.setWalletId(wallet.getId());
        e.setUserId(userId);
        e.setType(type);
        e.setAmount(amount);
        e.setBalanceAfter(wallet.getBalance());
        e.setDescription(desc);
        e.setCounterpartyUserId(counterparty);
        e.setCorrelationId(correlation);
        ledgerRepository.save(e);
    }
}
