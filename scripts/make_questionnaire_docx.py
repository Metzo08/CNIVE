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

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="CCCCCC", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def create_questionnaire_docx(output_path):
    doc = docx.Document()

    # Marges modérées pour tenir sur 2 pages aérées
    for section in doc.sections:
        section.top_margin = Inches(0.55)
        section.bottom_margin = Inches(0.55)
        section.left_margin = Inches(0.65)
        section.right_margin = Inches(0.65)

    NAVY = RGBColor(15, 23, 42)       # #0F172A
    GREEN = RGBColor(4, 120, 87)      # #047857
    BLUE = RGBColor(2, 132, 199)      # #0284C7
    GRAY = RGBColor(100, 116, 139)    # #64748B
    DARK = RGBColor(30, 41, 59)       # #1E293B
    RED = RGBColor(220, 38, 38)       # #DC2626

    # ==============================================================
    # 1. EN-TÊTE INSTITUTIONNEL
    # ==============================================================
    header_table = doc.add_table(rows=1, cols=3)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_table.autofit = False

    # Largeurs
    header_table.columns[0].width = Inches(2.0)
    header_table.columns[1].width = Inches(3.2)
    header_table.columns[2].width = Inches(2.0)

    # Col Gauche
    c_left = header_table.cell(0, 0)
    p_l = c_left.paragraphs[0]
    p_l.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_l = p_l.add_run("RÉPUBLIQUE DU SÉNÉGAL\nVILLE DE PIKINE\nGroupe Thématique Éducation")
    r_l.font.name = 'Calibri'
    r_l.font.size = Pt(8)
    r_l.font.bold = True
    r_l.font.color.rgb = GRAY

    # Col Centre
    c_mid = header_table.cell(0, 1)
    p_m = c_mid.paragraphs[0]
    p_m.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_m1 = p_m.add_run("PROGRAMME CNIVE\n")
    r_m1.font.name = 'Calibri'
    r_m1.font.size = Pt(13)
    r_m1.font.bold = True
    r_m1.font.color.rgb = GREEN
    r_m2 = p_m.add_run("Cartographie Numérique Intégrée des Vulnérabilités de l'Enfant\nProjet Pilote Dekkil Yakaar & MUTUALIS CSU")
    r_m2.font.name = 'Calibri'
    r_m2.font.size = Pt(8.5)
    r_m2.font.color.rgb = NAVY

    # Col Droite
    c_right = header_table.cell(0, 2)
    p_r = c_right.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_r = p_r.add_run("MINISTÈRE DE L'ÉDUCATION\nMSD DE PIKINE • SEN-CSU\nFondation NOUS CIMS")
    r_r.font.name = 'Calibri'
    r_r.font.size = Pt(8)
    r_r.font.bold = True
    r_r.font.color.rgb = GRAY

    doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # ==============================================================
    # 2. TITRE PRINCIPAL DU DOCUMENT
    # ==============================================================
    t_box = doc.add_table(rows=1, cols=1)
    t_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_cell = t_box.cell(0, 0)
    set_cell_background(t_cell, "F0FDF4") # Vert très clair
    set_cell_margins(t_cell, top=140, bottom=140, left=200, right=200)
    
    # Bordure verte
    tcPr = t_cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="12" w:color="047857"/><w:left w:val="single" w:sz="12" w:color="047857"/><w:bottom w:val="single" w:sz="12" w:color="047857"/><w:right w:val="single" w:sz="12" w:color="047857"/></w:tcBorders>')
    tcPr.append(tcBorders)

    p_t = t_cell.paragraphs[0]
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t1 = p_t.add_run("FICHE DE RENSEIGNEMENT FAMILIAL & ÉVALUATION DES BESOINS\n")
    r_t1.font.name = 'Calibri'
    r_t1.font.size = Pt(13)
    r_t1.font.bold = True
    r_t1.font.color.rgb = GREEN

    r_t2 = p_t.add_run("Questionnaire confidentiel destiné aux parents et tuteurs légaux pour l'attribution des soutiens scolaires, sanitaires (CMU) et sociaux.")
    r_t2.font.name = 'Calibri'
    r_t2.font.size = Pt(9)
    r_t2.font.italic = True
    r_t2.font.color.rgb = DARK

    # Message bienveillant aux parents
    p_note = doc.add_paragraph()
    p_note.paragraph_format.space_before = Pt(4)
    p_note.paragraph_format.space_after = Pt(6)
    r_note = p_note.add_run("Chers Parents / Tuteurs, ce document permet à l'équipe pédagogique et aux partenaires d'identifier les difficultés réelles de votre enfant afin de lui accorder les aides nécessaires (carte de santé CMU, fournitures, cours de renforcement, cantine). Merci de répondre avec sincérité ou de vous faire assister par le relais de l'école.")
    r_note.font.name = 'Calibri'
    r_note.font.size = Pt(8.5)
    r_note.font.color.rgb = GRAY

    def add_section_header(title, color_hex="047857"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, color_hex)
        set_cell_margins(cell, top=80, bottom=80, left=150, right=150)
        p = cell.paragraphs[0]
        r = p.add_run(title)
        r.font.name = 'Calibri'
        r.font.size = Pt(10)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # ==============================================================
    # SECTION 1 : IDENTITÉ DE L'ÉLÈVE
    # ==============================================================
    add_section_header("1. IDENTIFICATION DE L'ÉLÈVE (À remplir ou vérifier)", "047857")

    t_pupil = doc.add_table(rows=3, cols=2)
    t_pupil.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_pupil)
    t_pupil.columns[0].width = Inches(3.6)
    t_pupil.columns[1].width = Inches(3.6)

    t_pupil.cell(0, 0).paragraphs[0].add_run("Nom de l'élève : ________________________________").font.size = Pt(9)
    t_pupil.cell(0, 1).paragraphs[0].add_run("Prénom(s) : ____________________________________").font.size = Pt(9)

    t_pupil.cell(1, 0).paragraphs[0].add_run("Date de naissance : ___ / ___ / ______   Sexe : [  ] F  [  ] M").font.size = Pt(9)
    t_pupil.cell(1, 1).paragraphs[0].add_run("Identifiant CNIVE (si connu) : __________________").font.size = Pt(9)

    t_pupil.cell(2, 0).paragraphs[0].add_run("École fréquentée : ______________________________").font.size = Pt(9)
    t_pupil.cell(2, 1).paragraphs[0].add_run("Classe actuelle : [  ] CI  [  ] CP  [  ] CE1  [  ] CE2  [  ] CM1  [  ] CM2").font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==============================================================
    # SECTION 2 : TUTEUR & CONTACTS FAMILLE
    # ==============================================================
    add_section_header("2. RESPONSABLE LÉGAL / TUTEUR DE L'ENFANT", "0284C7")

    t_tutor = doc.add_table(rows=3, cols=2)
    t_tutor.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_tutor)
    t_tutor.columns[0].width = Inches(3.6)
    t_tutor.columns[1].width = Inches(3.6)

    t_tutor.cell(0, 0).paragraphs[0].add_run("Nom & Prénom du tuteur : ________________________").font.size = Pt(9)
    t_tutor.cell(0, 1).paragraphs[0].add_run("Lien avec l'enfant : [ ] Père  [ ] Mère  [ ] Oncle/Tante  [ ] Gd-parent  [ ] Autre").font.size = Pt(8.5)

    t_tutor.cell(1, 0).paragraphs[0].add_run("Téléphone direct (Tuteur) : _______________________").font.size = Pt(9)
    t_tutor.cell(1, 1).paragraphs[0].add_run("Numéro secondaire / WhatsApp : ___________________").font.size = Pt(9)

    t_tutor.cell(2, 0).paragraphs[0].add_run("Quartier de résidence : ___________________________").font.size = Pt(9)
    t_tutor.cell(2, 1).paragraphs[0].add_run("Adresse exacte / Repère : _________________________").font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==============================================================
    # SECTION 3 : SITUATION FAMILIALE & ÉTAT CIVIL (V_FAM & V_PROT)
    # ==============================================================
    add_section_header("3. SITUATION FAMILIALE & ÉTAT CIVIL (Protection de l'enfant)", "047857")

    t_fam = doc.add_table(rows=4, cols=1)
    t_fam.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_fam)

    t_fam.cell(0, 0).paragraphs[0].add_run("• L'enfant vit actuellement avec :   [  ] Ses deux parents     [  ] Sa mère seule     [  ] Son père seul     [  ] Un tuteur ou famille d'accueil").font.size = Pt(9)
    t_fam.cell(1, 0).paragraphs[0].add_run("• Situation des parents :   [  ] Deux parents vivants     [  ] Orphelin(e) de père     [  ] Orphelin(e) de mère     [  ] Orphelin(e) des deux parents").font.size = Pt(9)
    t_fam.cell(2, 0).paragraphs[0].add_run("• Acte de naissance : L'enfant possède-t-il un extrait de naissance officiel ?   [  ] Oui     [  ] Non (Besoin d'aide pour jugement supplétif)     [  ] En cours").font.size = Pt(9)
    t_fam.cell(3, 0).paragraphs[0].add_run("• Nombre total d'enfants à la charge du foyer : ______ enfants     (dont ______ enfants scolarisés)").font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==============================================================
    # SECTION 4 : SITUATION ÉCONOMIQUE & ALIMENTAIRE (V_ECO)
    # ==============================================================
    add_section_header("4. SITUATION ÉCONOMIQUE & NUTRITIONNELLE (V_ECO)", "D97706") # Ambre

    t_eco = doc.add_table(rows=4, cols=1)
    t_eco.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_eco)

    t_eco.cell(0, 0).paragraphs[0].add_run("• Activité du chef de ménage :   [  ] Salarié stable     [  ] Commerce informel / Journalier     [  ] Artisan / Ouvrier     [  ] Sans emploi / Retraité").font.size = Pt(9)
    t_eco.cell(1, 0).paragraphs[0].add_run("• Nombre de repas complets pris par l'élève par jour :   [  ] 1 seul repas     [  ] 2 repas     [  ] 3 repas réguliers").font.size = Pt(9)
    t_eco.cell(2, 0).paragraphs[0].add_run("• L'élève prend-il un petit-déjeuner le matin avant l'école ?   [  ] Jamais ou rarement     [  ] De temps en temps     [  ] Toujours").font.size = Pt(9)
    t_eco.cell(3, 0).paragraphs[0].add_run("• Achat des fournitures et cotisations scolaires :   [  ] Très difficile (manque de livres/cahiers)     [  ] Moyennement difficile     [  ] Sans difficulté").font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==============================================================
    # SECTION 5 : SANTÉ & COUVERTURE MÉDICALE (V_SAN)
    # ==============================================================
    add_section_header("5. COUVERTURE SANTÉ & BESOINS MÉDICAUX (V_SAN • CMU / MSD PIKINE)", "0284C7")

    t_san = doc.add_table(rows=4, cols=1)
    t_san.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_san)

    t_san.cell(0, 0).paragraphs[0].add_run("• L'enfant est-il adhérent à la CMU / Mutuelle de Santé Départementale de Pikine ?   [  ] Oui     [  ] Non     [  ] Ne sait pas").font.size = Pt(9)
    t_san.cell(1, 0).paragraphs[0].add_run("  -> Si Oui, N° d'adhésion Mutuelle : ____________________    Poste de santé habituel : ________________________________").font.size = Pt(8.5)
    t_san.cell(2, 0).paragraphs[0].add_run("• L'enfant souffre-t-il d'un problème de santé particulier ?   [  ] Non     [  ] Oui (Cocher : [ ] Vue/Yeux  [ ] Audition  [ ] Asthme  [ ] Handicap  [ ] Autre)").font.size = Pt(9)
    t_san.cell(3, 0).paragraphs[0].add_run("• Précision sur les allergies ou soins réguliers nécessaires : ___________________________________________________________").font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==============================================================
    # SECTION 6 : LOGEMENT & CADRE DE VIE (V_ENV & V_SCO)
    # ==============================================================
    add_section_header("6. CONDITIONS DE VIE & ÉTUDES À DOMICILE (V_ENV & V_SCO)", "4F46E5") # Indigo

    t_env = doc.add_table(rows=3, cols=1)
    t_env.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_env)

    t_env.cell(0, 0).paragraphs[0].add_run("• Zone d'habitation & Inondations : Votre maison est-elle touchée par les eaux de pluie en hivernage ?   [  ] Oui, souvent inondée     [  ] Parfois     [  ] Non").font.size = Pt(9)
    t_env.cell(1, 0).paragraphs[0].add_run("• Éclairage pour faire les devoirs le soir :   [  ] Électricité stable     [  ] Bougie / Lampe torche / Solaire     [  ] Pas d'éclairage suffisant").font.size = Pt(9)
    t_env.cell(2, 0).paragraphs[0].add_run("• L'élève a-t-il besoin de cours de renforcement / soutien scolaire gratuit à l'école ?   [  ] Oui, fortement     [  ] Non").font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==============================================================
    # SECTION 7 : BESOINS PRIORITAIRES DE LA FAMILLE
    # ==============================================================
    add_section_header("7. BESOINS PRIORITAIRES EXPRIMÉS PAR LA FAMILLE (Cocher les 3 urgences)", "047857")

    t_besoins = doc.add_table(rows=3, cols=2)
    t_besoins.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_besoins)
    t_besoins.columns[0].width = Inches(3.6)
    t_besoins.columns[1].width = Inches(3.6)

    t_besoins.cell(0, 0).paragraphs[0].add_run("[  ] Prise en charge santé / Carte CMU Pikine").font.size = Pt(9)
    t_besoins.cell(0, 1).paragraphs[0].add_run("[  ] Kit de fournitures scolaires & cartable").font.size = Pt(9)

    t_besoins.cell(1, 0).paragraphs[0].add_run("[  ] Cours de renforcement / Soutien scolaire").font.size = Pt(9)
    t_besoins.cell(1, 1).paragraphs[0].add_run("[  ] Aide alimentaire / Accès cantine scolaire").font.size = Pt(9)

    t_besoins.cell(2, 0).paragraphs[0].add_run("[  ] Aide obtention extrait d'acte de naissance").font.size = Pt(9)
    t_besoins.cell(2, 1).paragraphs[0].add_run("[  ] Suivi social spécifique / Veste d'hivernage").font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # ==============================================================
    # SECTION 8 : SIGNATURE & CADRE DE VALIDATION
    # ==============================================================
    t_sign = doc.add_table(rows=1, cols=2)
    t_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_sign.columns[0].width = Inches(3.6)
    t_sign.columns[1].width = Inches(3.6)

    c_parent = t_sign.cell(0, 0)
    set_cell_background(c_parent, "F8FAFC")
    set_cell_margins(c_parent, top=120, bottom=120, left=140, right=140)
    p_p = c_parent.paragraphs[0]
    p_p.add_run("Engagement du Parent / Tuteur :\n").font.bold = True
    p_p.add_run("Je certifie l'exactitude des informations fournies pour l'accompagnement de mon enfant.\n\nDate : ___ / ___ / 2026\nSignature du Parent / Tuteur :").font.size = Pt(8.5)

    c_school = t_sign.cell(0, 1)
    set_cell_background(c_school, "F0FDF4")
    set_cell_margins(c_school, top=120, bottom=120, left=140, right=140)
    p_s = c_school.paragraphs[0]
    p_s.add_run("Cadre Réservé à l'École / Relais CNIVE :\n").font.bold = True
    p_s.add_run("Nom de l'enquêteur ou relais : _____________________\nDate de saisie dans la plateforme : ___ / ___ / 2026\nVisa Directeur / Cachet de l'École :").font.size = Pt(8.5)

    # Sauvegarde
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    print(f"Questionnaire saved successfully at {output_path}")

if __name__ == '__main__':
    target_path = 'docs/QUESTIONNAIRE_VULNERABILITE_PARENTS_CNIVE.docx'
    create_questionnaire_docx(target_path)
