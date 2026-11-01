import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        # Don't draw running header on cover page
        if self._pageNumber > 1:
            self.saveState()
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            # Header
            self.drawString(54, 800, "BIBLE OFFICIELLE CNIVE — Sèn-e-Carte • République du Sénégal")
            self.drawRightString(541, 800, "Guide de Référence v2.3.0")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 792, 541, 792)

            # Footer
            self.line(54, 45, 541, 45)
            self.drawString(54, 32, "Diffusion Institutionnelle Réservée — Conforme CDP Loi 2008-12")
            page_text = f"Page {self._pageNumber} sur {page_count}"
            self.drawRightString(541, 32, page_text)
            self.restoreState()

def build_pdf(md_path, output_pdf):
    doc = SimpleDocTemplate(
        output_pdf,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#0F172A'),
        alignment=1, # Center
        spaceAfter=12
    )

    sub_style = ParagraphStyle(
        'CoverSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor('#2563EB'),
        alignment=1,
        spaceAfter=20
    )

    rep_style = ParagraphStyle(
        'CoverRep',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B'),
        alignment=1,
        spaceAfter=30
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E40AF'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#047857'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    box_text_style = ParagraphStyle(
        'BoxText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#065F46'),
        alignment=1
    )

    story = []

    # Cover Header
    story.append(Paragraph("<b>RÉPUBLIQUE DU SÉNÉGAL</b><br/>Un Peuple – Un But – Une Foi<br/><b>Ministère de l'Éducation Nationale • Ministère de la Santé et de l'Action Sociale</b>", rep_style))
    story.append(Spacer(1, 25))
    story.append(Paragraph("LA BIBLE OFFICIELLE DE LA PLATEFORME CNIVE", title_style))
    story.append(Paragraph("Cartographie Numérique Intégrée des Vulnérabilités de l'Enfant<br/>Dispositif National Sèn-e-Carte — Manuel Opérationnel & de Formation", sub_style))
    story.append(Spacer(1, 15))

    # Banner Table Box
    banner_p = Paragraph("<b>GUIDE OFFICIEL DE RÉFÉRENCE & DE FORMATION</b><br/>Guide complet pour Administrateurs, Directeurs d'école, Enseignants, Médecins scolaires, Travailleurs sociaux, Parents et Élèves.<br/>Conforme aux exigences de la CDP (Commission de Protection des Données Personnelles du Sénégal — Loi 2008-12)<br/>Version 2.3.0 Production Ready • Novembre 2026", box_text_style)
    banner_tab = Table([[banner_p]], colWidths=[480])
    banner_tab.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ECFDF5')),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor('#10B981')),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
    ]))
    story.append(banner_tab)
    story.append(PageBreak())

    # Read markdown and build story
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.split('\n')
    in_code = False

    for line in lines:
        l = line.strip()
        if l.startswith('```'):
            in_code = not in_code
            continue
        if in_code or l.startswith('> [!') or l.startswith('---'):
            continue
        if not l:
            continue

        # Format bold tags for ReportLab XML
        # Convert **text** to <b>text</b>
        parts = l.split('**')
        formatted = ""
        for i, part in enumerate(parts):
            if i % 2 == 1:
                formatted += f"<b>{part}</b>"
            else:
                formatted += part

        # Sanitize ampersands outside tags
        formatted = formatted.replace('& ', '&amp; ')

        if l.startswith('# '):
            story.append(Spacer(1, 10))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0F172A'), spaceAfter=8))
            story.append(Paragraph(formatted[2:], h1_style))
        elif l.startswith('## '):
            story.append(Spacer(1, 6))
            story.append(Paragraph(formatted[3:], h2_style))
        elif l.startswith('### '):
            story.append(Paragraph(formatted[4:], h3_style))
        elif l.startswith(('- ', '* ')):
            story.append(Paragraph(f"• {formatted[2:]}", bullet_style))
        elif l.startswith(('1. ', '2. ', '3. ', '4. ', '5. ')):
            story.append(Paragraph(formatted, bullet_style))
        elif l.startswith('|') and '|' in l[1:]:
            if '---' in l:
                continue
            cols = [c.strip() for c in l.split('|')[1:-1]]
            if len(cols) >= 2:
                row_txt = f"<b>{cols[0]} :</b> " + " | ".join(cols[1:])
                story.append(Paragraph(row_txt, bullet_style))
        else:
            story.append(Paragraph(formatted, body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built: {output_pdf}")

if __name__ == '__main__':
    md = 'docs/BIBLE_CNIVE_PLATEFORME.md'
    pdf = sys.argv[1] if len(sys.argv) > 1 else 'docs/BIBLE_CNIVE_PLATEFORME.pdf'
    build_pdf(md, pdf)
