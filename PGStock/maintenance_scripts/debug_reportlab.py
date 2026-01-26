import sys
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, black, white, grey
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

def test_pdf_generation():
    print("Starting PDF generation test...")
    try:
        # Styles
        # Avoid getSampleStyleSheet() and parent=... to prevent deepcopy TypeError in Python 3.12
        
        title_style = ParagraphStyle(
            'CustomTitle',
            fontSize=16,
            textColor=HexColor('#4a90e2'),
            spaceAfter=10,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold',
            leading=20
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            fontSize=12,
            textColor=HexColor('#2c3e50'),
            spaceAfter=6,
            fontName='Helvetica-Bold',
            leading=14
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            fontSize=9,
            textColor=black,
            fontName='Helvetica',
            leading=12
        )
        
        info_style = ParagraphStyle(
            'Info',
            fontSize=8,
            textColor=HexColor('#666'),
            fontName='Helvetica',
            leading=10
        )
        
        # Contenu du PDF
        content = []
        
        content.append(Paragraph('MOUVEMENTS DE STOCK', title_style))
        content.append(Paragraph('Rapport de Suivi', info_style))
        content.append(Spacer(1, 0.3*cm))
        
        # Informations de filtrage
        info_text = f"<b>Généré le:</b> TEST DATE"
        content.append(Paragraph(info_text, info_style))
        content.append(Spacer(1, 0.5*cm))
        
        # Tableau des mouvements
        # Préparer les données du tableau
        data = [['Date/Heure', 'Produit', 'Type', 'Quantité', 'Point de Vente', 'Utilisateur']]

        # Styles spécifiques pour les cellules (définition explicite pour éviter deepcopy)
        product_style = ParagraphStyle('Product', fontSize=7.0, leading=8, fontName='Helvetica', textColor=black)
        point_style = ParagraphStyle('Point', fontSize=7.5, leading=8, fontName='Helvetica', textColor=black)
        date_style = ParagraphStyle('Date', fontSize=7.0, leading=8, fontName='Courier', textColor=black)
        user_style = ParagraphStyle('User', fontSize=7.0, leading=8, fontName='Helvetica', textColor=black)

        # Mock data loop
        for i in range(5):
            # Utiliser Paragraph pour permettre le wrapping et conserver le style
            created_para = Paragraph("01/01/2024", date_style)
            product_para = Paragraph("Test Product", product_style)
            type_para = Paragraph("Entry", ParagraphStyle('Type', fontSize=7.0, alignment=TA_CENTER, fontName='Helvetica', textColor=black, leading=8))
            qty_para = Paragraph("10", ParagraphStyle('Qty', fontSize=7.0, alignment=TA_RIGHT, fontName='Helvetica', textColor=black, leading=8))
            point_para = Paragraph("Main Store", point_style)
            user_para = Paragraph("Admin", user_style)

            data.append([
                created_para,
                product_para,
                type_para,
                qty_para,
                point_para,
                user_para
            ])

        # Créer le tableau (ajuster les largeurs pour une meilleure lisibilité)
        table = Table(
            data,
            colWidths=[2.4*cm, 7.2*cm, 1.6*cm, 1.2*cm, 4.0*cm, 3.0*cm],
            repeatRows=1
        )

        # Style du tableau
        table.setStyle(TableStyle([
            # En-tête
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),

            # Corps du tableau
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
            ('ALIGN', (3, 1), (3, -1), 'RIGHT'),  # Quantité à droite
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7.0),
            ('TOPPADDING', (0, 1), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 3),

            # Alternance de couleurs
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f9f9f9')]),

            # Bordures et paddings
            ('GRID', (0, 0), (-1, -1), 0.5, grey),
            ('LINEABOVE', (0, 0), (-1, 0), 2, HexColor('#2c3e50')),
            ('LINEBELOW', (0, -1), (-1, -1), 2, HexColor('#2c3e50')),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))

        content.append(table)
        
        # Buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=1*cm,
            leftMargin=1*cm,
            topMargin=1*cm,
            bottomMargin=1*cm
        )
        
        doc.build(content)
        print("Success!")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_generation()
