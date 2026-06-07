package com.payflow.invoicing.service;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.UnitValue;
import com.payflow.invoicing.entity.InvoiceEntity;
import com.payflow.invoicing.exception.ApiException;
import com.payflow.invoicing.repository.InvoiceRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

// Genera el PDF de una factura concreta (diseño con colores de marca) usando la librería iText.
@Service
public class InvoicePdfService {

    private final InvoiceRepository invoiceRepo;

    public InvoicePdfService(InvoiceRepository invoiceRepo) {
        this.invoiceRepo = invoiceRepo;
    }

    // Devuelve la factura como PDF en bytes. Busca por id Y userId para que nadie acceda a facturas ajenas.
    public byte[] generate(String userId, String invoiceId) {
        InvoiceEntity inv = invoiceRepo.findByIdAndUserId(invoiceId, userId)
                .orElseThrow(() -> ApiException.notFound("Factura no encontrada"));

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter   writer = new PdfWriter(baos);
            PdfDocument pdf    = new PdfDocument(writer);
            Document    doc    = new Document(pdf);

            DeviceRgb cian = new DeviceRgb(8, 145, 178);
            DeviceRgb gris = new DeviceRgb(107, 114, 128);

            doc.add(new Paragraph("FACTURA")
                    .setFontSize(28).setBold().setFontColor(cian));
            doc.add(new Paragraph(inv.getNumeroFactura())
                    .setFontSize(14).setFontColor(gris));
            doc.add(new Paragraph(" "));

            doc.add(new Paragraph("CLIENTE").setBold().setFontColor(cian));
            doc.add(new Paragraph("Nombre: " + inv.getClienteNombre()));
            if (inv.getClienteNif() != null && !inv.getClienteNif().isBlank())
                doc.add(new Paragraph("NIF: " + inv.getClienteNif()));
            doc.add(new Paragraph("Fecha: " + (inv.getFecha() != null ? inv.getFecha().toString() : "-")));
            doc.add(new Paragraph(" "));

            doc.add(new Paragraph("CONCEPTO").setBold().setFontColor(cian));
            doc.add(new Paragraph(inv.getConcepto()));
            doc.add(new Paragraph(" "));

            Table tabla = new Table(new float[]{4, 2});
            tabla.setWidth(UnitValue.createPercentValue(100));

            tabla.addCell(new Cell().add(new Paragraph("Base imponible")));
            tabla.addCell(new Cell().add(new Paragraph(
                    String.format("%.2f EUR", inv.getBaseImponible()))));

            tabla.addCell(new Cell().add(new Paragraph(
                    String.format("IVA (%d%%)", inv.getTipoIva().intValue()))));
            tabla.addCell(new Cell().add(new Paragraph(
                    String.format("%.2f EUR", inv.getCuotaIva()))));

            tabla.addCell(new Cell().add(new Paragraph(
                    String.format("IRPF (-%d%%)", inv.getTipoIrpf().intValue()))));
            tabla.addCell(new Cell().add(new Paragraph(
                    String.format("-%.2f EUR", inv.getCuotaIrpf()))));

            tabla.addCell(new Cell().add(new Paragraph("TOTAL A COBRAR").setBold()));
            tabla.addCell(new Cell().add(new Paragraph(
                    String.format("%.2f EUR", inv.getTotal())).setBold()));

            doc.add(tabla);
            doc.add(new Paragraph(" "));
            doc.add(new Paragraph("Generado con PayFlow — Gestion para autonomos")
                    .setFontSize(9).setFontColor(gris).setItalic());

            doc.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Error generando PDF: " + e.getMessage());
        }
    }
}
