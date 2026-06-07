package com.payflow.transaction.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.payflow.transaction.entity.TransactionEntity;
import com.payflow.transaction.repository.TransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

// Genera el informe mensual de transacciones en PDF usando la librería iText.
@Service
public class PdfReportService {

    private static final Logger log = LoggerFactory.getLogger(PdfReportService.class);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TransactionRepository transactionRepository;

    public PdfReportService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    // Devuelve el PDF como array de bytes (no se guarda en disco; el controlador lo envía al navegador).
    public byte[] generateMonthlyReport(String userId, int year, int month) {
        // Calculamos el primer y último día del mes pedido para acotar la consulta.
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = from.withDayOfMonth(from.lengthOfMonth());

        List<TransactionEntity> transactions =
                transactionRepository.findByUserIdAndFechaBetweenOrderByFechaDesc(userId, from, to);

        log.info("Generando PDF para usuario {} — {}/{} ({} transacciones)", userId, month, year, transactions.size());

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(out);
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf)) {

            // Título
            document.add(new Paragraph("PayFlow — Informe mensual")
                    .setFontSize(20)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER));

            document.add(new Paragraph(String.format("Periodo: %s/%d", month < 10 ? "0" + month : month, year))
                    .setFontSize(12)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20));

            // Tabla
            Table table = new Table(UnitValue.createPercentArray(new float[]{15, 15, 40, 15, 15}))
                    .useAllAvailableWidth();

            addHeaderCell(table, "Fecha");
            addHeaderCell(table, "Tipo");
            addHeaderCell(table, "Descripción");
            addHeaderCell(table, "Categoría");
            addHeaderCell(table, "Cantidad");

            // Recorremos las transacciones: cada una es una fila y vamos acumulando los totales.
            double totalIngresos = 0;
            double totalGastos   = 0;

            for (TransactionEntity t : transactions) {
                table.addCell(t.getFecha().format(FMT));
                table.addCell(t.getTipo().name());
                table.addCell(t.getDescripcion() != null ? t.getDescripcion() : "");
                table.addCell(t.getCategoria() != null ? t.getCategoria().name() : "");

                String cantidad = String.format("%.2f €", t.getCantidad());
                Cell cell = new Cell().add(new Paragraph(cantidad));
                if (t.getTipo() == TransactionEntity.Tipo.INGRESO) {
                    cell.setFontColor(ColorConstants.GREEN);
                    totalIngresos += t.getCantidad();
                } else {
                    cell.setFontColor(ColorConstants.RED);
                    totalGastos += t.getCantidad();
                }
                table.addCell(cell);
            }

            document.add(table);

            // Resumen final
            document.add(new Paragraph(String.format(
                    "\nTotal ingresos: %.2f €   |   Total gastos: %.2f €   |   Balance: %.2f €",
                    totalIngresos, totalGastos, totalIngresos - totalGastos))
                    .setFontSize(11)
                    .setBold()
                    .setMarginTop(15));

        } catch (Exception e) {
            log.error("Error generando PDF: {}", e.getMessage());
            throw new RuntimeException("No se pudo generar el informe PDF");
        }

        return out.toByteArray();
    }

    private void addHeaderCell(Table table, String text) {
        table.addHeaderCell(new Cell()
                .add(new Paragraph(text).setBold())
                .setBackgroundColor(ColorConstants.LIGHT_GRAY));
    }
}
