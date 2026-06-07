package com.payflow.invoicing.service;

import com.payflow.invoicing.dto.*;
import com.payflow.invoicing.entity.ExpenseEntity;
import com.payflow.invoicing.entity.InvoiceEntity;
import com.payflow.invoicing.exception.ApiException;
import com.payflow.invoicing.repository.ExpenseRepository;
import com.payflow.invoicing.repository.InvoiceRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

// Lógica de negocio del módulo de autónomos: facturas, gastos y el resumen fiscal trimestral.
@Service
public class InvoiceService {

    private final InvoiceRepository invoiceRepo;
    private final ExpenseRepository expenseRepo;

    public InvoiceService(InvoiceRepository invoiceRepo, ExpenseRepository expenseRepo) {
        this.invoiceRepo = invoiceRepo;
        this.expenseRepo = expenseRepo;
    }

    // Crea una factura calculando sus cuotas. Si no se indican tipos, usa los habituales (IVA 21%, IRPF 15%).
    public InvoiceResponse create(String userId, InvoiceRequest req) {
        double tipoIva   = req.getTipoIva()  != null ? req.getTipoIva()  : 21.0;
        double tipoIrpf  = req.getTipoIrpf() != null ? req.getTipoIrpf() : 15.0;
        double base      = req.getBaseImponible();
        double cuotaIva  = base * tipoIva  / 100.0;  // IVA que se le suma al cliente.
        double cuotaIrpf = base * tipoIrpf / 100.0;  // IRPF que se le retiene al autónomo.

        InvoiceEntity inv = new InvoiceEntity();
        inv.setUserId(userId);
        inv.setClienteNombre(req.getClienteNombre());
        inv.setClienteNif(req.getClienteNif());
        inv.setConcepto(req.getConcepto());
        inv.setBaseImponible(base);
        inv.setTipoIva(tipoIva);
        inv.setCuotaIva(cuotaIva);
        inv.setTipoIrpf(tipoIrpf);
        inv.setCuotaIrpf(cuotaIrpf);
        inv.setTotal(base + cuotaIva - cuotaIrpf);
        inv.setFecha(req.getFecha() != null ? req.getFecha() : LocalDate.now());
        inv.setNumeroFactura(generarNumero(userId));

        return new InvoiceResponse(invoiceRepo.save(inv));
    }

    // Genera el número de factura correlativo por año y usuario (p. ej. F-2026-001, F-2026-002...).
    private String generarNumero(String userId) {
        int year  = LocalDate.now().getYear();
        long count = invoiceRepo.countByUserIdAndYear(userId, year);
        return String.format("F-%d-%03d", year, count + 1);
    }

    public List<InvoiceResponse> getAll(String userId) {
        return invoiceRepo.findByUserIdOrderByFechaDesc(userId)
                .stream().map(InvoiceResponse::new).toList();
    }

    public InvoiceEntity getEntity(String userId, String id) {
        return invoiceRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Factura no encontrada"));
    }

    public InvoiceResponse getOne(String userId, String id) {
        return new InvoiceResponse(getEntity(userId, id));
    }

    // No borramos facturas: las marcamos como CANCELADA para conservar la trazabilidad fiscal.
    public void cancel(String userId, String id) {
        InvoiceEntity inv = getEntity(userId, id);
        inv.setEstado(InvoiceEntity.Estado.CANCELADA);
        invoiceRepo.save(inv);
    }

    // Calcula el resumen fiscal de un trimestre: lo que el autónomo debe declarar a Hacienda.
    public QuarterlySummaryResponse getQuarterlySummary(String userId, int year, int quarter) {
        // Rango de fechas del trimestre: 1T → ene-mar, 2T → abr-jun, etc.
        LocalDate from = LocalDate.of(year, (quarter - 1) * 3 + 1, 1);
        LocalDate to   = from.plusMonths(3).minusDays(1);

        // Facturas emitidas (no canceladas) y gastos deducibles dentro del trimestre.
        List<InvoiceEntity> facturas = invoiceRepo
                .findByUserIdAndFechaBetweenAndEstadoNot(userId, from, to, InvoiceEntity.Estado.CANCELADA);
        List<ExpenseEntity> gastos = expenseRepo
                .findByUserIdAndFechaBetweenAndDeducibleTrue(userId, from, to);

        // Sumamos las bases y cuotas de ingresos (facturas) y de gastos.
        double totalIngresos   = facturas.stream().mapToDouble(InvoiceEntity::getBaseImponible).sum();
        double ivaRepercutido  = facturas.stream().mapToDouble(InvoiceEntity::getCuotaIva).sum();   // IVA cobrado a clientes.
        double retencionesIRPF = facturas.stream().mapToDouble(InvoiceEntity::getCuotaIrpf).sum();  // IRPF ya retenido.
        double totalGastos     = gastos.stream().mapToDouble(ExpenseEntity::getBaseImponible).sum();
        double ivaSoportado    = gastos.stream()                                                    // IVA pagado en compras.
                .mapToDouble(e -> e.getCuotaIva() != null ? e.getCuotaIva() : 0.0).sum();

        // Modelo 303 (IVA): IVA cobrado − IVA pagado = lo que se ingresa a Hacienda.
        double resultado303  = ivaRepercutido - ivaSoportado;
        // Modelo 130 (IRPF): 20% del beneficio neto, menos lo ya retenido (nunca negativo).
        double beneficioNeto = totalIngresos - totalGastos;
        double pago130       = Math.max(0, beneficioNeto * 0.20 - retencionesIRPF);

        return new QuarterlySummaryResponse(
                year, quarter,
                totalIngresos, totalIngresos,
                ivaRepercutido, ivaSoportado, resultado303,
                totalIngresos, retencionesIRPF, pago130);
    }

    // ── Expenses ──────────────────────────────────────────────

    // Registra un gasto deducible. Asume IVA del 21% sobre la base para calcular su cuota.
    public ExpenseResponse createExpense(String userId, ExpenseRequest req) {
        double base     = req.getBaseImponible();
        double cuotaIva = base * 0.21;

        ExpenseEntity exp = new ExpenseEntity();
        exp.setUserId(userId);
        exp.setDescripcion(req.getDescripcion());
        exp.setProveedor(req.getProveedor());
        exp.setBaseImponible(base);
        exp.setCuotaIva(cuotaIva);
        exp.setTotal(base + cuotaIva);
        exp.setFecha(req.getFecha() != null ? req.getFecha() : LocalDate.now());
        exp.setCategoria(req.getCategoria() != null ? req.getCategoria() : ExpenseEntity.Categoria.OTROS);

        return new ExpenseResponse(expenseRepo.save(exp));
    }

    public List<ExpenseResponse> getExpenses(String userId) {
        return expenseRepo.findByUserIdOrderByFechaDesc(userId)
                .stream().map(ExpenseResponse::new).toList();
    }

    public void deleteExpense(String userId, String id) {
        ExpenseEntity exp = expenseRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> ApiException.notFound("Gasto no encontrado"));
        expenseRepo.delete(exp);
    }
}
