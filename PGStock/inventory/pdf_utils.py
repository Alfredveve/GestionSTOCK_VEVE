import os
from datetime import datetime
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import cm

class BasePDFBuilder:
    """
    Base class for generating professional PDFs with a consistent design.
    """
    # Colors
    PRIMARY = colors.HexColor("#3b82f6")
    SECONDARY = colors.HexColor("#1e293b")
    TEXT_MUTED = colors.HexColor("#64748b")
    BG_LIGHT = colors.HexColor("#f8fafc")
    BORDER = colors.HexColor("#e2e8f0")
    WHITE = colors.white

    def __init__(self, response, pagesize=A4, title="Document"):
        self.response = response
        self.pagesize = pagesize
        self.doc = SimpleDocTemplate(
            response, 
            pagesize=pagesize,
            rightMargin=1*cm, 
            leftMargin=1*cm, 
            topMargin=1*cm, 
            bottomMargin=1*cm
        )
        self.doc.title = title
        self.elements = []
        self.styles = getSampleStyleSheet()
        self._init_custom_styles()

    def _init_custom_styles(self):
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=self.SECONDARY,
            spaceAfter=10
        )
        self.subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=self.PRIMARY,
            fontWeight='BOLD',
            spaceAfter=20
        )
        self.meta_style = ParagraphStyle(
            'MetaStyle',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=self.TEXT_MUTED,
            alignment=2 # Right
        )
        self.label_style = ParagraphStyle(
            'Label',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=self.PRIMARY,
            fontName='Helvetica-Bold',
            spaceAfter=6
        )

    def add_header(self, title, subtitle="PGStock - Système de Gestion d'Inventaire", meta=None):
        self.elements.append(Paragraph(title, self.title_style))
        self.elements.append(Paragraph(subtitle, self.subtitle_style))
        if meta:
            self.elements.append(Paragraph(meta, self.meta_style))
        self.elements.append(Spacer(1, 0.5 * cm))

    def add_table(self, headers, data, col_widths=None):
        table_data = [headers] + data
        if not col_widths:
            # Equal distribution
            available_width = (self.pagesize[0] - 2*cm)
            col_widths = [available_width / len(headers)] * len(headers)
            
        t = Table(table_data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.PRIMARY),
            ('TEXTCOLOR', (0, 0), (-1, 0), self.WHITE),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), self.BG_LIGHT),
            ('GRID', (0, 0), (-1, -1), 0.5, self.BORDER),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [self.WHITE, colors.HexColor("#f1f5f9")]),
        ]))
        self.elements.append(t)

    def add_footer(self):
        self.elements.append(Spacer(1, 1 * cm))
        date_str = datetime.now().strftime('%d/%m/%Y %H:%M')
        self.elements.append(Paragraph(f"Document généré par PGStock - {date_str}", self.styles['Normal']))

    def build(self):
        self.doc.build(self.elements)

def export_to_pdf(headers, data, title, filename_prefix="Export"):
    response = HttpResponse(content_type='application/pdf')
    now = datetime.now()
    filename = f"{filename_prefix}_{now.strftime('%Y%m%d_%H%M')}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    builder = BasePDFBuilder(response, pagesize=landscape(A4), title=title)
    builder.add_header(title, meta=f"Généré le : {now.strftime('%d/%m/%Y %H:%M')} | Items : {len(data)}")
    builder.add_table(headers, data)
    builder.add_footer()
    builder.build()
    return response

def _add_invoice_common(builder, obj, items, obj_type="FACTURE"):
    # Styles for single document
    styles = builder.styles
    style_company = ParagraphStyle('Company', parent=styles['Normal'], fontSize=10, leading=14)
    style_label = ParagraphStyle('DocLabel', parent=styles['Normal'], fontSize=32, fontName='Helvetica-Bold', textColor=colors.HexColor("#cbd5e1"), alignment=2)
    style_client_name = ParagraphStyle('ClientName', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold', spaceAfter=4)
    style_client_info = ParagraphStyle('ClientInfo', parent=styles['Normal'], fontSize=9, textColor=builder.TEXT_MUTED, leading=12)
    style_box_val = ParagraphStyle('BoxVal', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', alignment=2)
    
    # 1. Header Table
    company_info = [
        Paragraph("<b>PGStock</b>", ParagraphStyle('CompName', fontSize=14, spaceAfter=6)),
        Paragraph("Adresse: Conakry, Guinée", style_company),
        Paragraph("Tel: +224 620 00 00 00", style_company),
        Paragraph("Email: contact@pgstock.com", style_company)
    ]
    
    number = getattr(obj, 'invoice_number', getattr(obj, 'quote_number', 'N/A'))
    date_issued = obj.date_issued.strftime('%d/%m/%Y')
    
    info_box_data = [
        [Paragraph("Numéro", builder.styles['Normal']), Paragraph(f"#{number}", style_box_val)],
        [Paragraph("Date", builder.styles['Normal']), Paragraph(date_issued, style_box_val)],
    ]
    
    info_table = Table(info_box_data, colWidths=[2.5*cm, 3.5*cm])
    info_table.setStyle(TableStyle([('BOTTOMPADDING', (0,0), (-1,-1), 8)]))
    
    header_right = [Paragraph(obj_type, style_label), Spacer(1, 0.2*cm), info_table]
    header_table = Table([[company_info, header_right]], colWidths=[10*cm, 8*cm])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('ALIGN', (1,0), (1,0), 'RIGHT')]))
    builder.elements.append(header_table)
    builder.elements.append(Spacer(1, 1 * cm))

    # 2. Client Box
    client = obj.client
    client_content = [
        [Paragraph("DESTINATAIRE", builder.label_style)],
        [Paragraph(client.name, style_client_name)],
        [Paragraph(f"📍 {client.address or 'Adresse non définie'}", style_client_info)],
        [Paragraph(f"📞 {client.phone or '-'}", style_client_info)]
    ]
    client_table = Table(client_content, colWidths=[18*cm])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0f9ff")),
        ('BOX', (0,0), (-1,-1), 0.5, builder.PRIMARY),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    builder.elements.append(client_table)
    builder.elements.append(Spacer(1, 1 * cm))

    # 3. Items Table
    headers = ['Désignation', 'Quantité', 'Prix Unitaire', 'Remise', 'Total']
    data = []
    for item in items:
        data.append([
            item.product.name,
            f"{item.quantity} {'Colis' if item.is_wholesale else 'Unités'}",
            f"{float(item.unit_price):,.0f} GNF",
            f"{item.discount}%",
            f"{float(item.total):,.0f} GNF"
        ])
    
    builder.add_table(headers, data)
    builder.elements.append(Spacer(1, 0.5 * cm))

    # 4. Summary
    total_amount = f"{float(obj.total_amount):,.0f} GNF"
    summary_data = [
        ["TOTAL À PAYER", total_amount]
    ]
    summary_table = Table(summary_data, colWidths=[13*cm, 5*cm])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 12),
        ('BACKGROUND', (0,0), (-1,-1), builder.PRIMARY),
        ('TEXTCOLOR', (0,0), (-1,-1), builder.WHITE),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (1,0), (1,-1), 15),
    ]))
    builder.elements.append(summary_table)

def export_invoice_to_pdf(invoice):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Facture_{invoice.invoice_number}.pdf"'
    builder = BasePDFBuilder(response, title=f"Facture {invoice.invoice_number}")
    _add_invoice_common(builder, invoice, invoice.invoiceitem_set.all(), "FACTURE")
    builder.add_footer()
    builder.build()
    return response

def export_quote_to_pdf(quote):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Devis_{quote.quote_number}.pdf"'
    builder = BasePDFBuilder(response, title=f"Devis {quote.quote_number}")
    _add_invoice_common(builder, quote, quote.quoteitem_set.all(), "DEVIS")
    builder.add_footer()
    builder.build()
    return response
