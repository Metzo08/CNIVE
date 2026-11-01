import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_bible_docx(output_path):
    doc = docx.Document()

    # Set page margins (2 cm)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Palette
    NAVY = RGBColor(15, 23, 42)      # #0F172A
    BLUE = RGBColor(37, 99, 235)     # #2563EB
    EMERALD = RGBColor(5, 150, 105)  # #059669
    GRAY = RGBColor(100, 116, 139)   # #64748B
    DARK = RGBColor(30, 41, 59)      # #1E293B

    # Title Page
    p_rep = doc.add_paragraph()
    p_rep.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_rep = p_rep.add_run("RÉPUBLIQUE DU SÉNÉGAL\nUn Peuple – Un But – Une Foi\nMinistère de l'Éducation Nationale | Ministère de la Santé et de l'Action Sociale")
    r_rep.font.name = 'Calibri'
    r_rep.font.size = Pt(10)
    r_rep.font.bold = True
    r_rep.font.color.rgb = GRAY

    doc.add_paragraph("\n")

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("LA BIBLE OFFICIELLE\nDE LA PLATEFORME CNIVE")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(28)
    r_title.font.bold = True
    r_title.font.color.rgb = NAVY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Cartographie Numérique Intégrée des Vulnérabilités de l'Enfant\nDispositif Sèn-e-Carte — Manuel Général d'Utilisation & de Formation")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(14)
    r_sub.font.bold = True
    r_sub.font.color.rgb = BLUE

    doc.add_paragraph("\n")

    # Banner box
    table_box = doc.add_table(rows=1, cols=1)
    table_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_box = table_box.rows[0].cells[0]
    set_cell_background(cell_box, "F0FDF4") # Light emerald
    set_cell_margins(cell_box, 160, 160, 200, 200)
    p_box = cell_box.paragraphs[0]
    r_box = p_box.add_run("DOCUMENT OFFICIEL DE RÉFÉRENCE NATIONALE\nConforme aux normes de la Commission de Protection des Données Personnelles (CDP du Sénégal — Loi 2008-12)\nVersion 2.3.0 Production Ready • Novembre 2026")
    r_box.font.name = 'Calibri'
    r_box.font.size = Pt(10.5)
    r_box.font.bold = True
    r_box.font.color.rgb = EMERALD

    doc.add_page_break()

    # Read markdown source to populate structured content
    with open('docs/BIBLE_CNIVE_PLATEFORME.md', 'r', encoding='utf-8') as f:
        md_text = f.read()

    lines = md_text.split('\n')
    in_code_block = False

    for line in lines:
        line_strip = line.strip()

        # Skip mermaid diagrams and markdown alerts in raw text
        if line_strip.startswith('```'):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        if line_strip.startswith('> [!'):
            continue
        if line_strip.startswith('---'):
            continue

        if line_strip.startswith('# '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(18)
            p.paragraph_format.space_after = Pt(8)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(line_strip[2:])
            r.font.name = 'Calibri'
            r.font.size = Pt(20)
            r.font.bold = True
            r.font.color.rgb = NAVY

        elif line_strip.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(line_strip[3:])
            r.font.name = 'Calibri'
            r.font.size = Pt(15)
            r.font.bold = True
            r.font.color.rgb = BLUE

        elif line_strip.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(line_strip[4:])
            r.font.name = 'Calibri'
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = DARK

        elif line_strip.startswith('- ') or line_strip.startswith('* '):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            # Handle basic bold
            text = line_strip[2:]
            parts = text.split('**')
            for i, part in enumerate(parts):
                r = p.add_run(part)
                r.font.name = 'Calibri'
                r.font.size = Pt(11)
                r.font.color.rgb = DARK
                if i % 2 == 1:
                    r.font.bold = True

        elif line_strip.startswith(('1. ', '2. ', '3. ', '4. ', '5. ')):
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            text = line_strip[3:]
            parts = text.split('**')
            for i, part in enumerate(parts):
                r = p.add_run(part)
                r.font.name = 'Calibri'
                r.font.size = Pt(11)
                r.font.color.rgb = DARK
                if i % 2 == 1:
                    r.font.bold = True

        elif line_strip.startswith('|') and '|' in line_strip[1:]:
            # Simple table row detection
            if '---' in line_strip:
                continue
            cols = [c.strip() for c in line_strip.split('|')[1:-1]]
            if len(cols) >= 2:
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(1)
                p.paragraph_format.space_after = Pt(1)
                r_prefix = p.add_run("• " + cols[0] + " : ")
                r_prefix.font.bold = True
                r_prefix.font.name = 'Calibri'
                r_prefix.font.color.rgb = BLUE
                r_desc = p.add_run(" | ".join(cols[1:]))
                r_desc.font.name = 'Calibri'
                r_desc.font.color.rgb = DARK

        elif line_strip:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            parts = line_strip.split('**')
            for i, part in enumerate(parts):
                r = p.add_run(part)
                r.font.name = 'Calibri'
                r.font.size = Pt(11)
                r.font.color.rgb = DARK
                if i % 2 == 1:
                    r.font.bold = True

    # Save Word document
    doc.save(output_path)
    print(f'Word document successfully created: {output_path}')

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'docs/BIBLE_CNIVE_PLATEFORME.docx'
    create_bible_docx(out)
