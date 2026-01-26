import os
from datetime import datetime
from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import cm

def export_to_pdf(headers, data, title, filename_prefix="Export"):
    """
    Standardized utility for premium PDF exports using ReportLab (Pure Python).
    Works on Windows without GTK dependencies.
    """
    now = datetime.now()
    date_str = now.strftime('%d/%m/%Y %H:%M')
    
    # Prepare Response
    response = HttpResponse(content_type='application/pdf')
    filename = f"{filename_prefix}_{now.strftime('%Y%m%d_%H%M')}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    # Create PDF Document
    doc = SimpleDocTemplate(response, pagesize=landscape(A4), rightMargin=1*cm, leftMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    elements = []

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor("#3b82f6"),
        fontWeight='BOLD',
        spaceAfter=20
    )
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#64748b"),
        alignment=2 # Right aligned
    )

    # Header
    elements.append(Paragraph(title, title_style))
    elements.append(Paragraph("PGStock - Système de Gestion d'Inventaire", subtitle_style))
    elements.append(Paragraph(f"Généré le : {date_str} | Items : {len(data)}", meta_style))
    elements.append(Spacer(1, 0.5 * cm))

    # Table Data
    # Wrap data in Paragraphs if they are long
    table_data = [headers]
    for row in data:
        table_data.append(row)

    # Calculate column widths (90% of landscape width / number of columns)
    col_count = len(headers)
    available_width = (landscape(A4)[0] - 2*cm)
    col_width = available_width / col_count

    # Create Table
    t = Table(table_data, colWidths=[col_width] * col_count)

    # Table Style
    table_style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
    ])
    t.setStyle(table_style)
    elements.append(t)

    # Footer
    elements.append(Spacer(1, 1 * cm))
    elements.append(Paragraph(f"Document généré par PGStock - {date_str}", styles['Normal']))

    # Build PDF
    doc.build(elements)
    
    return response
def export_invoice_to_pdf(invoice):
    """
    Generate a professional single invoice PDF using ReportLab with the new design.
    """
    now = datetime.now()
    
    # Prepare Response
    response = HttpResponse(content_type='application/pdf')
    filename = f"Facture_{invoice.invoice_number}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    # Create PDF Document (Portrait for single invoice)
    doc = SimpleDocTemplate(response, pagesize=A4, rightMargin=1*cm, leftMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    doc.title = f"Facture {invoice.invoice_number}"
    elements = []

    # Styles
    styles = getSampleStyleSheet()
    
    # Custom Colors
    col_blue_bg = colors.HexColor("#f0f9ff") # Light blue for client box
    col_dark_header = colors.HexColor("#1e293b") # Dark slate for table header
    col_blue_text = colors.HexColor("#2563eb") # Primary blue
    col_yellow_bg = colors.HexColor("#fffbeb") # Light yellow for notes
    col_gray_border = colors.HexColor("#e2e8f0") # Light gray border
    col_facture_label = colors.HexColor("#e2e8f0") # Very light gray for 'FACTURE' label

    # Paragraph Styles
    style_company = ParagraphStyle('Company', parent=styles['Normal'], fontSize=10, leading=14)
    style_facture_label = ParagraphStyle('FactureLabel', parent=styles['Normal'], fontSize=32, fontName='Helvetica-Bold', textColor=colors.HexColor("#cbd5e1"), alignment=2) # Right align
    style_client_label = ParagraphStyle('ClientLabel', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor("#3b82f6"), fontName='Helvetica-Bold', spaceAfter=6)
    style_client_name = ParagraphStyle('ClientName', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold', spaceAfter=4, textColor=colors.black)
    style_client_info = ParagraphStyle('ClientInfo', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#475569"), leading=12)
    
    # Boxed Info Style (Date, Number etc)
    style_box_label = ParagraphStyle('BoxLabel', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor("#64748b"))
    style_box_val = ParagraphStyle('BoxVal', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', alignment=2)
    style_status_pill = ParagraphStyle('StatusPill', parent=styles['Normal'], fontSize=8, textColor=col_blue_text, alignment=2)

    # HEADER SECTION
    # Left: Company Info (Placeholder for Logo + Text)
    # Right: FACTURE label + Info Group
    
    company_info = [
        Paragraph("<b>PGStock</b>", ParagraphStyle('CompName', fontSize=14, spaceAfter=6)),
        Paragraph("Adresse: Conakry, Guinée", style_company),
        Paragraph("Tel: +224 620 00 00 00", style_company),
        Paragraph("Email: contact@pgstock.com", style_company)
    ]
    
    # Info Box Data (Number, Date, Due Date, Status)
    info_box_data = [
        [Paragraph("Numéro", style_box_label), Paragraph(f"#{invoice.invoice_number}", style_box_val)],
        [Paragraph("Date", style_box_label), Paragraph(invoice.date_issued.strftime('%d/%m/%Y'), style_box_val)],
        [Paragraph("Échéance", style_box_label), Paragraph(invoice.date_due.strftime('%d/%m/%Y'), style_box_val)],
        [Paragraph("Statut", style_box_label), Paragraph("Enregistré", style_status_pill)], # Dynamic status can be mapped here
    ]
    
    info_table = Table(info_box_data, colWidths=[2.5*cm, 3.5*cm])
    info_table.setStyle(TableStyle([
        ('valign', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    
    # Container for Info Box (Simulate rounded border with a container table is tricky in basic ReportLab, 
    # using a simple border table instead)
    info_container = Table([[info_table]], colWidths=[6.5*cm])
    info_container.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, col_blue_text),
        ('ROUNDEDCORNERS', [10, 10, 10, 10]), # Requires ReportLab 3.6.11+
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))

    header_right = [
        Paragraph("FACTURE", style_facture_label),
        Spacer(1, 0.2*cm),
        info_container
    ]

    header_table = Table([
        [company_info, header_right]
    ], colWidths=[10*cm, 8*cm])
    
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    
    elements.append(header_table)
    elements.append(Spacer(1, 1.5*cm))

    # CLIENT SECTION (Rounded Box Blue BG)
    client_content = [
        [Paragraph("FACTURE À", style_client_label)],
        [Paragraph(invoice.client.name, style_client_name)],
        [Paragraph(f"📍 {invoice.client.address or 'Adresse non définie'}", style_client_info)],
        [Paragraph(f"📞 {invoice.client.phone or '-'}", style_client_info)],
        [Paragraph(f"✉️ {invoice.client.email or '-'}", style_client_info)]
    ]
    
    client_table = Table(client_content, colWidths=[18*cm])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), col_blue_bg),
        ('BOX', (0,0), (-1,-1), 0.5, col_gray_border),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))
    
    elements.append(client_table)
    elements.append(Spacer(1, 1*cm))

    # ITEMS TABLE
    # Columns: DESCRIPTION, QTE, P.U., REMISE (placeholder), TOTAL
    headers = ['DESCRIPTION', 'QTÉ', 'P.U.', 'REMISE', 'TOTAL']
    
    # Process items
    data = [headers]
    for item in invoice.invoiceitem_set.all():
        data.append([
            Paragraph(f"<b>{item.product.name}</b><br/><font size=8 color='#64748b'>SKU: {item.product.sku or 'N/A'}</font>", styles['Normal']),
            str(item.quantity),
            f"{float(item.unit_price):,.0f} GNF",
            "0 GNF", # Per-item discount placeholder, currently 0 global discount usually applied
            f"{float(item.total):,.0f} GNF"
        ])

    col_widths = [8*cm, 2*cm, 3*cm, 2.5*cm, 3.5*cm]
    t = Table(data, colWidths=col_widths)
    
    t.setStyle(TableStyle([
        # Header Style
        ('BACKGROUND', (0, 0), (-1, 0), col_dark_header),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        # Cell alignment
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),  # Description Left
        ('ALIGN', (1, 0), (1, -1), 'CENTER'), # Qty Center
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'), # Others Right
        
        # Row styles
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 12),
        ('TOPPADDING', (0, 1), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, col_gray_border),
    ]))
    
    elements.append(t)
    elements.append(Spacer(1, 1*cm))
    
    # FOOTER SECTION (Notes & Totals)
    
    # Notes Box (Left)
    notes_content = [
        [Paragraph("NOTES", ParagraphStyle('NoteTitle', fontSize=7, fontName='Helvetica-Bold'))],
        [Paragraph("Le présent document tient lieu de facture. Merci de respecter les délais de paiement.", ParagraphStyle('NoteBody', fontSize=8, textColor=colors.HexColor("#78716c"), italic=True))]
    ]
    notes_table = Table(notes_content, colWidths=[10*cm])
    notes_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), col_yellow_bg),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ('sidebar', (0,0), (0,-1), 2, colors.HexColor("#fbbf24")) # Left border like a blockquote
    ]))
    
    # Totals Box (Right) - ALWAYS SHOW ALL FIELDS
    totals_data = []
    
    # Subtotal
    totals_data.append([
        Paragraph("Sous-total HT", styles['Normal']), 
        Paragraph(f"{float(invoice.subtotal):,.0f} GNF", style_box_val)
    ])
    
    # Tax - ONLY SHOW IF > 0
    if invoice.tax_amount > 0:
        totals_data.append([
            Paragraph(f"TVA ({invoice.tax_rate}%)", styles['Normal']), 
            Paragraph(f"{float(invoice.tax_amount):,.0f} GNF", style_box_val)
        ])
    
    # Discount - ONLY SHOW IF > 0
    if invoice.discount_amount > 0:
        totals_data.append([
            Paragraph("Remise", styles['Normal']), 
            Paragraph(f"{float(invoice.discount_amount):,.0f} GNF", style_box_val)
        ])
    
    # Total Final
    totals_data.append([
        Paragraph("Total TTC", ParagraphStyle('TotalLabel', fontSize=12, fontName='Helvetica-Bold')), 
        Paragraph(f"{float(invoice.total_amount):,.0f} GNF", ParagraphStyle('TotalVal', fontSize=12, fontName='Helvetica-Bold', textColor=col_blue_text, alignment=2))
    ])
    
    totals_table = Table(totals_data, colWidths=[4*cm, 4*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        # Box around the whole totals section
        ('BOX', (0,0), (-1,-1), 0.5, col_gray_border),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))

    # Combine Notes and Totals in a container table
    footer_layout = Table([
        [notes_table, totals_table]
    ], colWidths=[10.5*cm, 8.5*cm])
    
    footer_layout.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    
    elements.append(footer_layout)
    elements.append(Spacer(1, 2*cm))
    
    # Bottom Center Footer
    elements.append(Paragraph("Merci pour votre confiance !", ParagraphStyle('Thanks', parent=styles['Normal'], alignment=1, fontSize=10, textColor=colors.HexColor("#64748b"))))
    elements.append(Paragraph("PGStock System", ParagraphStyle('SysInfo', parent=styles['Normal'], alignment=1, fontSize=8, textColor=colors.HexColor("#94a3b8"))))

    # Build PDF
    doc.build(elements)
    
    return response

def export_quote_to_pdf(quote):
    """
    Generate a professional single quote PDF using ReportLab.
    """
    # Prepare Response
    response = HttpResponse(content_type='application/pdf')
    filename = f"Devis_{quote.quote_number}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    # Create PDF Document (Portrait)
    doc = SimpleDocTemplate(response, pagesize=A4, rightMargin=1*cm, leftMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    doc.title = f"Devis {quote.quote_number}"
    elements = []

    # Styles
    styles = getSampleStyleSheet()
    col_blue_bg = colors.HexColor("#f0f9ff")
    col_dark_header = colors.HexColor("#1e293b")
    col_blue_text = colors.HexColor("#2563eb")
    col_yellow_bg = colors.HexColor("#fffbeb")
    col_gray_border = colors.HexColor("#e2e8f0")

    style_company = ParagraphStyle('Company', parent=styles['Normal'], fontSize=10, leading=14)
    style_label = ParagraphStyle('DocLabel', parent=styles['Normal'], fontSize=32, fontName='Helvetica-Bold', textColor=colors.HexColor("#cbd5e1"), alignment=2)
    style_client_name = ParagraphStyle('ClientName', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold', spaceAfter=4, textColor=colors.black)
    style_client_info = ParagraphStyle('ClientInfo', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor("#475569"), leading=12)
    style_box_label = ParagraphStyle('BoxLabel', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor("#64748b"))
    style_box_val = ParagraphStyle('BoxVal', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', alignment=2)

    # Header
    company_info = [
        Paragraph("<b>PGStock</b>", ParagraphStyle('CompName', fontSize=14, spaceAfter=6)),
        Paragraph("Adresse: Conakry, Guinée", style_company),
        Paragraph("Tel: +224 620 00 00 00", style_company),
        Paragraph("Email: contact@pgstock.com", style_company)
    ]
    
    info_box_data = [
        [Paragraph("Numéro", style_box_label), Paragraph(f"#{quote.quote_number}", style_box_val)],
        [Paragraph("Date", style_box_label), Paragraph(quote.date_issued.strftime('%d/%m/%Y'), style_box_val)],
        [Paragraph("Validité", style_box_label), Paragraph(quote.valid_until.strftime('%d/%m/%Y'), style_box_val)],
        [Paragraph("Statut", style_box_label), Paragraph(quote.get_status_display(), style_box_val)],
    ]
    
    info_table = Table(info_box_data, colWidths=[2.5*cm, 3.5*cm])
    info_container = Table([[info_table]], colWidths=[6.5*cm])
    info_container.setStyle(TableStyle([('BOX', (0,0), (-1,-1), 1, col_blue_text), ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10), ('TOPPADDING', (0,0), (-1,-1), 10), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))

    header_table = Table([[company_info, [Paragraph("DEVIS", style_label), Spacer(1, 0.2*cm), info_container]]], colWidths=[10*cm, 8*cm])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('ALIGN', (1,0), (1,0), 'RIGHT')]))
    elements.append(header_table)
    elements.append(Spacer(1, 1.5*cm))

    # Client
    client_content = [[Paragraph("DEVIS ÉTABLI POUR", ParagraphStyle('CL', parent=styles['Normal'], fontSize=8, textColor=col_blue_text, fontName='Helvetica-Bold', spaceAfter=6))], [Paragraph(quote.client.name, style_client_name)], [Paragraph(f"📍 {quote.client.address or 'Adresse non définie'}", style_client_info)]]
    client_table = Table(client_content, colWidths=[18*cm])
    client_table.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), col_blue_bg), ('BOX', (0,0), (-1,-1), 0.5, col_gray_border), ('LEFTPADDING', (0,0), (-1,-1), 15), ('RIGHTPADDING', (0,0), (-1,-1), 15), ('TOPPADDING', (0,0), (-1,-1), 15), ('BOTTOMPADDING', (0,0), (-1,-1), 15)]))
    elements.append(client_table)
    elements.append(Spacer(1, 1*cm))

    # Items
    headers = ['DESCRIPTION', 'MODE', 'QTÉ', 'P.U.', 'TOTAL']
    data = [headers]
    for item in quote.quoteitem_set.all():
        data.append([
            Paragraph(f"<b>{item.product.name}</b>", styles['Normal']),
            'Gros' if item.is_wholesale else 'Détail',
            str(item.quantity),
            f"{float(item.unit_price):,.0f} GNF",
            f"{float(item.total):,.0f} GNF"
        ])

    t = Table(data, colWidths=[8*cm, 2.5*cm, 2*cm, 2.5*cm, 3.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), col_dark_header),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, col_gray_border),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 1*cm))

    # Footer
    totals_data = [
        [Paragraph("Sous-total", styles['Normal']), Paragraph(f"{float(quote.subtotal):,.0f} GNF", style_box_val)],
        [Paragraph("Total Devis", ParagraphStyle('TL', fontSize=12, fontName='Helvetica-Bold')), Paragraph(f"{float(quote.total_amount):,.0f} GNF", ParagraphStyle('TV', fontSize=12, fontName='Helvetica-Bold', textColor=col_blue_text, alignment=2))]
    ]
    totals_table = Table(totals_data, colWidths=[4*cm, 4*cm])
    totals_table.setStyle(TableStyle([('ALIGN', (1,0), (1,-1), 'RIGHT'), ('BOX', (0,0), (-1,-1), 0.5, col_gray_border), ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10)]))
    
    notes_table = Table([[Paragraph("NOTES", ParagraphStyle('NT', fontSize=7, fontName='Helvetica-Bold')), Paragraph(quote.notes or "Ce devis est valide pendant 30 jours.", ParagraphStyle('NB', fontSize=8, italic=True))]], colWidths=[2*cm, 8*cm])
    
    footer_layout = Table([[notes_table, totals_table]], colWidths=[10.5*cm, 8.5*cm])
    footer_layout.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('ALIGN', (1,0), (1,0), 'RIGHT')]))
    elements.append(footer_layout)
    
    doc.build(elements)
    return response

def export_order_to_pdf(order):
    """
    Generate a professional single order PDF using ReportLab.
    """
    # Prepare Response
    response = HttpResponse(content_type='application/pdf')
    filename = f"Commande_{order.order_number}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    doc = SimpleDocTemplate(response, pagesize=A4, rightMargin=1*cm, leftMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    doc.title = f"Commande {order.order_number}"
    elements = []
    styles = getSampleStyleSheet()
    col_blue_bg = colors.HexColor("#f0f9ff")
    col_dark_header = colors.HexColor("#1e293b")
    col_blue_text = colors.HexColor("#2563eb")
    col_gray_border = colors.HexColor("#e2e8f0")

    # Reuse styles from above
    style_label = ParagraphStyle('DocLabel', parent=styles['Normal'], fontSize=32, fontName='Helvetica-Bold', textColor=colors.HexColor("#cbd5e1"), alignment=2)
    style_box_val = ParagraphStyle('BoxVal', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold', alignment=2)

    # Header
    info_box_data = [
        [Paragraph("Numéro", styles['Normal']), Paragraph(f"#{order.order_number}", style_box_val)],
        [Paragraph("Date", styles['Normal']), Paragraph(order.date_created.strftime('%d/%m/%Y'), style_box_val)],
        [Paragraph("Statut", styles['Normal']), Paragraph(order.get_status_display(), style_box_val)],
        [Paragraph("Paiement", styles['Normal']), Paragraph(order.get_payment_status_display(), style_box_val)],
    ]
    info_table = Table(info_box_data, colWidths=[2.5*cm, 3.5*cm])
    info_container = Table([[info_table]], colWidths=[6.5*cm])
    info_container.setStyle(TableStyle([('BOX', (0,0), (-1,-1), 1, col_blue_text), ('LEFTPADDING', (0,0), (-1,-1), 10), ('RIGHTPADDING', (0,0), (-1,-1), 10), ('TOPPADDING', (0,0), (-1,-1), 10), ('BOTTOMPADDING', (0,0), (-1,-1), 10)]))
    
    company_info = [Paragraph("<b>PGStock</b>", ParagraphStyle('CN', fontSize=14, spaceAfter=6)), Paragraph("Adresse: Conakry, Guinée", styles['Normal'])]
    header_table = Table([[company_info, [Paragraph("COMMANDE", style_label), Spacer(1, 0.2*cm), info_container]]], colWidths=[10*cm, 8*cm])
    elements.append(header_table)
    elements.append(Spacer(1, 1*cm))

    # Client
    client_content = [[Paragraph("CLIENT", ParagraphStyle('CL', fontSize=8, fontName='Helvetica-Bold'))], [Paragraph(order.client.name, ParagraphStyle('CN', fontSize=14, fontName='Helvetica-Bold'))]]
    client_table = Table(client_content, colWidths=[18*cm])
    client_table.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), col_blue_bg), ('LEFTPADDING', (0,0), (-1,-1), 15)]))
    elements.append(client_table)
    elements.append(Spacer(1, 1*cm))

    # Items
    headers = ['DESCRIPTION', 'QTÉ', 'P.U.', 'TOTAL']
    data = [headers]
    for item in order.items.all():
        data.append([
            Paragraph(f"<b>{item.product.name}</b>", styles['Normal']),
            str(item.quantity),
            f"{float(item.unit_price):,.0f} GNF",
            f"{float(item.total_price):,.0f} GNF"
        ])
    
    t = Table(data, colWidths=[10*cm, 2*cm, 3*cm, 3*cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), col_dark_header), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('ALIGN', (2, 0), (-1, -1), 'RIGHT'), ('LINEBELOW', (0, 0), (-1, -1), 0.5, col_gray_border)]))
    elements.append(t)
    elements.append(Spacer(1, 1*cm))

    # Totals
    totals_data = [
        [Paragraph("Total TTC", styles['Normal']), Paragraph(f"{float(order.total_amount):,.0f} GNF", style_box_val)],
        [Paragraph("Payé", styles['Normal']), Paragraph(f"{float(order.amount_paid):,.0f} GNF", style_box_val)],
        [Paragraph("Solde", ParagraphStyle('TL', fontName='Helvetica-Bold')), Paragraph(f"{float(order.total_amount - order.amount_paid):,.0f} GNF", ParagraphStyle('TV', fontName='Helvetica-Bold', textColor=colors.red))]
    ]
    elements.append(Table(totals_data, colWidths=[4*cm, 4*cm], hAlign='RIGHT'))
    
    doc.build(elements)
    return response
