from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
from app.models import models
from app.utils.auth import get_current_user
from app.routers.audit import log_action
import uuid
from datetime import datetime
from io import BytesIO
from enum import Enum

# PDF generation with reportlab
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

router = APIRouter(prefix="/reports", tags=["Reports"])

# --- Models & Enums ---

class ReportType(str, Enum):
    PUPIL_PROFILE_FULL = "pupil_profile_full"
    PUPIL_PROFILE_PERSONAL = "pupil_profile_personal"
    VULNERABILITY_SUMMARY = "vulnerability_summary"
    VULNERABILITY_DETAILED = "vulnerability_detailed"
    HEALTH_SUMMARY = "health_summary"
    HEALTH_DETAILED = "health_detailed"
    SCHOOL_SUMMARY_BASIC = "school_summary_basic"
    SCHOOL_SUMMARY_GLOBAL = "school_summary_global"
    INTERVENTION_LOG = "intervention_log"

class ReportRequest(BaseModel):
    report_type: str  # Use string to allow all IDs from UI
    entity_id: str
    include_charts: bool = False

# --- Mappings for Internationalization ---
CMU_STATUS_MAP = {
    "enrolled": "Enrôlé",
    "pending": "En attente",
    "not_enrolled": "Non enrôlé"
}

VULNERABILITY_LEVEL_MAP = {
    "LOW": "Faible",
    "MODERATE": "Modéré",
    "HIGH": "Élevé",
    "CRITICAL": "Critique"
}

PUPIL_STATUS_MAP = {
    "ACTIVE": "Actif",
    "TRANSFERRED": "Transféré",
    "DROPOUT": "Décrochage"
}

# --- Nous Cims Branding ---

NC_TEAL = colors.HexColor('#00A99D')
NC_ORANGE = colors.HexColor('#F39200')
NC_DARK = colors.HexColor('#4D4D4D')
NC_LIGHT_TEAL = colors.HexColor('#E6F6F5')
NC_LIGHT_GRAY = colors.HexColor('#F8F9FA')

def format_general(text: str) -> str:
    """Helper for sentence case: 'Dossier individuel du bénéficiaire'"""
    if not text or str(text).upper() == "N/A": return "N/A"
    t = str(text).strip()
    if not t: return "N/A"
    return t[0].upper() + t[1:].lower()

def format_name(text: str) -> str:
    """Helper for title case: 'Assane Kane', 'Pikine'"""
    if not text or str(text).upper() == "N/A": return "N/A"
    t = str(text).strip()
    if not t: return "N/A"
    # Capitalize each word for names/entities
    return " ".join([word.capitalize() for word in t.split()])

def format_score(val) -> str:
    """Always return 2 decimals: '7.90'"""
    try:
        return "{:.2f}".format(float(val))
    except:
        return "0.00"

def get_nc_styles():
    styles = getSampleStyleSheet()
    
    # Custom Styles
    if 'NCTitle' not in styles:
        styles.add(ParagraphStyle(
            name='NCTitle',
            parent=styles['Title'],
            fontSize=24,
            textColor=NC_TEAL,
            alignment=TA_LEFT,
            fontName='Helvetica-Bold',
            spaceAfter=20
        ))
    
    if 'NCHeading' not in styles:
        styles.add(ParagraphStyle(
            name='NCHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=NC_TEAL,
            fontName='Helvetica-Bold',
            spaceBefore=15,
            spaceAfter=10
        ))
    
    if 'NCSubHeading' not in styles:
        styles.add(ParagraphStyle(
            name='NCSubHeading',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=NC_ORANGE,
            fontName='Helvetica-Bold',
            spaceBefore=10,
            spaceAfter=5
        ))

    if 'NCBody' not in styles:
        styles.add(ParagraphStyle(
            name='NCBody',
            parent=styles['Normal'],
            fontSize=10,
            textColor=NC_DARK,
            lineHeight=14,
            alignment=TA_LEFT
        ))
    
    if 'NCFooter' not in styles:
        styles.add(ParagraphStyle(
            name='NCFooter',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.gray,
            alignment=TA_CENTER
        ))
    
    return styles

def add_header(elements, title, subtitle=None):
    styles = get_nc_styles()
    
    # Path to logos
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_gte_path = os.path.join(base_dir, "assets", "logo_gte.jpg")
    logo_nc_path = os.path.join(base_dir, "assets", "logo_nouscims.png")
    logo_min_path = os.path.join(base_dir, "assets", "logo_ministere.png")

    # Header Table (Logos + Branding)
    min_img = Paragraph(f"<b>{format_name('Sénégal')}</b>", ParagraphStyle('B', fontSize=8, alignment=TA_CENTER))
    gte_img = Paragraph(f"<b>{format_name('Cnive')}</b>", styles['NCHeading'])
    nc_img = Paragraph(f"{format_name('Fondation')} <b>{format_name('Nous cims')}</b>", ParagraphStyle('B', fontSize=9, textColor=NC_ORANGE, alignment=TA_RIGHT))
    
    if os.path.exists(logo_min_path):
        min_img = Image(logo_min_path, width=4*cm, height=1.2*cm)
    if os.path.exists(logo_gte_path):
        gte_img = Image(logo_gte_path, width=1.2*cm, height=1.2*cm)
    if os.path.exists(logo_nc_path):
        nc_img = Image(logo_nc_path, width=2.5*cm, height=1*cm)

    header_data = [
        [min_img, 
         Paragraph(f"<b>{format_name('Cnive')}</b> | {format_general('Système d''information')}<br/><font size='8'>{format_general('Groupe thématique éducation Pikine')}</font>", ParagraphStyle('H', fontSize=12, textColor=NC_TEAL, leading=14, alignment=TA_CENTER)), 
         nc_img]
    ]
    
    header_table = Table(header_data, colWidths=[4.5*cm, 10*cm, 3*cm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (1,0), 'CENTER'),
        ('ALIGN', (2,0), (2,0), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(header_table)
    
    # Divider
    line = Table([['']], colWidths=[17.5*cm], rowHeights=[1.5])
    line.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), NC_TEAL)]))
    elements.append(line)
    
    elements.append(Spacer(1, 0.8*cm))
    elements.append(Paragraph(format_general(title), styles['NCTitle']))
    if subtitle:
        elements.append(Paragraph(format_general(subtitle), styles['NCBody']))
    elements.append(Spacer(1, 0.5*cm))

# --- Report Generators ---

def generate_json_report(request: ReportRequest, db: Session):
    return {"message": "Une erreur est survenue lors de la génération du PDF."}

def draw_score_bar(score, max_score=100, width=5*cm):
    """Helper to draw a progress bar in a table cell"""
    percent = min(100, max(0, (score / max_score) * 100))
    bar_color = NC_TEAL
    if percent > 75: bar_color = colors.HexColor('#D32F2F')
    elif percent > 50: bar_color = colors.HexColor('#F57C00')
    elif percent > 25: bar_color = colors.HexColor('#FBC02D')
    
    # Nested table for the bar
    bar = Table([['']], colWidths=[(percent/100)*width], rowHeights=[0.4*cm])
    bar.setStyle(TableStyle([('BACKGROUND', (0,0), (0,0), bar_color), ('ROUNDEDCORNERS', [3,3,3,3])]))
    
    bg = Table([[bar]], colWidths=[width], rowHeights=[0.4*cm])
    bg.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), colors.HexColor('#EEEEEE')),
        ('LEFTPADDING', (0,0), (0,0), 0),
        ('RIGHTPADDING', (0,0), (0,0), 0),
        ('TOPPADDING', (0,0), (0,0), 0),
        ('BOTTOMPADDING', (0,0), (0,0), 0),
        ('ALIGN', (0,0), (0,0), 'LEFT'),
        ('VALIGN', (0,0), (0,0), 'MIDDLE'),
        ('ROUNDEDCORNERS', [3,3,3,3])
    ]))
    return bg

def generate_pupil_report(pupil_id: str, db: Session, report_type: str = ReportType.PUPIL_PROFILE_FULL):
    """Report 1: Profil Complet vs Informations Personnelles"""
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil: raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    school = db.query(models.School).filter(models.School.id == pupil.school_id).first()
    styles = get_nc_styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    elements = []
    
    is_full = report_type == ReportType.PUPIL_PROFILE_FULL
    title = format_general("Dossier individuel du bénéficiaire") if is_full else format_general("Fiche d'état civil et scolarité")
    add_header(elements, f"{format_name(pupil.first_name)} {format_name(pupil.last_name)}", title)
    
    # 1. Informations Personnelles
    elements.append(Paragraph(format_general("1. État civil & scolarité"), styles['NCHeading']))
    raw_status = pupil.status.value if hasattr(pupil.status, 'value') else str(pupil.status)
    status_label = format_name(PUPIL_STATUS_MAP.get(raw_status, raw_status or "Actif"))
    
    data = [
        [Paragraph(f"<b>{format_general('Prénom:')}</b>", styles['NCBody']), format_name(pupil.first_name), Paragraph(f"<b>{format_general('Nom:')}</b>", styles['NCBody']), format_name(pupil.last_name)],
        [Paragraph(f"<b>{format_general('Date de naissance:')}</b>", styles['NCBody']), str(pupil.birth_date), Paragraph(f"<b>{format_general('Sexe:')}</b>", styles['NCBody']), format_name("Fille" if pupil.gender == "F" else "Garçon")],
        [Paragraph(f"<b>{format_general('National id:')}</b>", styles['NCBody']), pupil.national_id or "N/A", Paragraph(f"<b>{format_general('Identifiant cnive:')}</b>", styles['NCBody']), pupil.cnive_id],
        [Paragraph(f"<b>{format_general('Établissement:')}</b>", styles['NCBody']), Paragraph(format_name(school.name if school else "N/A"), styles['NCBody']), Paragraph(f"<b>{format_general('Classe:')}</b>", styles['NCBody']), pupil.grade or "N/A"],
        [Paragraph(f"<b>{format_general('Statut actuel:')}</b>", styles['NCBody']), status_label, Paragraph(f"<b>{format_general('Adresse:')}</b>", styles['NCBody']), Paragraph(format_general(pupil.address or "Non renseignée"), styles['NCBody'])]
    ]
    t = Table(data, colWidths=[4*cm, 4.7*cm, 4*cm, 4.7*cm])
    t.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (0,-1), NC_LIGHT_GRAY), ('BACKGROUND', (2,0), (2,-1), NC_LIGHT_GRAY), ('PADDING', (0,0), (-1,-1), 6), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
    elements.append(t)
    
    if is_full:
        # 2. Contacts Parents
        elements.append(Spacer(1, 0.5*cm))
        elements.append(Paragraph(format_general("2. Contacts d'urgence (Tuteurs)"), styles['NCSubHeading']))
        parent_data = [
            [Paragraph(f"<b>{format_general('Tuteur principal')}</b>", styles['NCBody']), format_name(pupil.contact_parent1_name or "N/A"), Paragraph(f"<b>{format_general('Téléphone:')}</b>", styles['NCBody']), pupil.contact_parent1_phone or "N/A"],
            [Paragraph(f"<b>{format_general('Tuteur secondaire')}</b>", styles['NCBody']), format_name(pupil.contact_parent2_name or "N/A"), Paragraph(f"<b>{format_general('Téléphone:')}</b>", styles['NCBody']), pupil.contact_parent2_phone or "N/A"]
        ]
        pt = Table(parent_data, colWidths=[4*cm, 4.7*cm, 4*cm, 4.7*cm])
        pt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (0,-1), NC_LIGHT_GRAY), ('PADDING', (0,0), (-1,-1), 6)]))
        elements.append(pt)

        # 3. Résumé Santé & Risque
        elements.append(Spacer(1, 0.5*cm))
        elements.append(Paragraph(format_general("3. Aperçu santé & vulnérabilité"), styles['NCHeading']))
        hr = db.query(models.HealthRecord).filter(models.HealthRecord.pupil_id == pupil.id).first()
        latest_v = db.query(models.VulnerabilityAssessment).filter(models.VulnerabilityAssessment.pupil_id == pupil.id).order_by(models.VulnerabilityAssessment.created_at.desc()).first()
        
        raw_classification = latest_v.classification.value if latest_v and hasattr(latest_v.classification, 'value') else str(latest_v.classification if latest_v else "N/A")
        classification_display = format_name(VULNERABILITY_LEVEL_MAP.get(raw_classification, raw_classification))
        
        summary_data = [
            [Paragraph(f"<b>{format_general('Groupe sanguin')}</b>", styles['NCBody']), format_name(hr.blood_group if hr else "N/A"), Paragraph(f"<b>{format_general('Niveau de risque')}</b>", styles['NCBody']), classification_display],
            [Paragraph(f"<b>{format_general('Allergies/maladies')}</b>", styles['NCBody']), Paragraph(format_general(hr.allergies or "Aucune"), styles['NCBody']), Paragraph(f"<b>{format_general('Score global fev')}</b>", styles['NCBody']), f"{format_score(latest_v.total_score if latest_v else 0)}/120"]
        ]
        st = Table(summary_data, colWidths=[4*cm, 4.7*cm, 4*cm, 4.7*cm])
        st.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (0,-1), NC_LIGHT_TEAL), ('PADDING', (0,0), (-1,-1), 8)]))
        elements.append(st)

    # Footer
    elements.append(Spacer(1, 2*cm))
    elements.append(Paragraph(f"{format_general('Document généré le')} {datetime.now().strftime('%d/%m/%Y à %H:%M')} | {format_name('Cnive Sénégal')}", styles['NCFooter']))
    doc.build(elements)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=profil_{pupil.cnive_id}.pdf"})

def generate_vulnerability_report(pupil_id: str, db: Session, report_type: str = ReportType.VULNERABILITY_DETAILED):
    """Report 2: Vulnérabilité FEV (Summary vs Detailed)"""
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil: raise HTTPException(status_code=404, detail="Élève non trouvé")
    latest_v = db.query(models.VulnerabilityAssessment).filter(models.VulnerabilityAssessment.pupil_id == pupil.id).order_by(models.VulnerabilityAssessment.created_at.desc()).first()
    
    styles = get_nc_styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm)
    elements = []
    
    is_detailed = report_type == ReportType.VULNERABILITY_DETAILED
    subtitle = format_general("Détail des 6 dimensions fev") if is_detailed else format_general("Résumé du niveau de risque")
    add_header(elements, format_general("Évaluation de vulnérabilité"), f"{subtitle} - {format_name(pupil.first_name)} {format_name(pupil.last_name)}")
    
    if latest_v:
        class_color = NC_TEAL
        raw_classification = latest_v.classification.value if hasattr(latest_v.classification, 'value') else str(latest_v.classification)
        if raw_classification == "CRITICAL": class_color = colors.HexColor('#D32F2F')
        elif raw_classification == "HIGH": class_color = colors.HexColor('#F57C00')
        elif raw_classification == "MODERATE": class_color = colors.HexColor('#FBC02D')
        
        elements.append(Paragraph(format_general("1. Niveau de risque global"), styles['NCHeading']))
        v_data = [[
            Paragraph(f"<font size='14' color='white'><b>{format_general('Risque:')} {format_name(VULNERABILITY_LEVEL_MAP.get(raw_classification, raw_classification))}</b></font>", ParagraphStyle('R', alignment=TA_CENTER)),
            Paragraph(f"<font size='14' color='white'><b>{format_general('Score total:')} {format_score(latest_v.total_score)}/120</b></font>", ParagraphStyle('R', alignment=TA_CENTER))
        ]]
        vt = Table(v_data, colWidths=[8.5*cm, 8.5*cm], rowHeights=[1.2*cm])
        vt.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), class_color), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('ROUNDEDCORNERS', [10,10,10,10])]))
        elements.append(vt)
        
        if is_detailed:
            elements.append(Spacer(1, 0.8*cm))
            elements.append(Paragraph(format_general("2. Évaluation des 6 dimensions (Détail)"), styles['NCHeading']))
            dim_data = [
                [Paragraph(f"<b>{format_general('Dimension')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Score')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Visualisation')}</b>", styles['NCBody'])],
                [Paragraph(format_general("Économique"), styles['NCBody']), str(latest_v.economic_score), draw_score_bar(latest_v.economic_score, 20)],
                [Paragraph(format_general("Scolaire"), styles['NCBody']), str(latest_v.school_score), draw_score_bar(latest_v.school_score, 20)],
                [Paragraph(format_general("Sanitaire & nutritionnelle"), styles['NCBody']), str(latest_v.health_nutrition_score), draw_score_bar(latest_v.health_nutrition_score, 20)],
                [Paragraph(format_general("Familiale & sociale"), styles['NCBody']), str(latest_v.family_social_score), draw_score_bar(latest_v.family_social_score, 20)],
                [Paragraph(format_general("Protection de l'enfant"), styles['NCBody']), str(latest_v.protection_score), draw_score_bar(latest_v.protection_score, 20)],
                [Paragraph(format_general("Environnementale"), styles['NCBody']), str(latest_v.environmental_score), draw_score_bar(latest_v.environmental_score, 20)]
            ]
            dt = Table(dim_data, colWidths=[6*cm, 3*cm, 8.5*cm])
            dt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (-1,0), NC_LIGHT_TEAL), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('PADDING', (0,0), (-1,-1), 8)]))
            elements.append(dt)
        
        elements.append(Spacer(1, 1*cm))
        elements.append(Paragraph(f"<b>{format_general('Note:')}</b> {format_general('L''évaluation est basée sur le nouveau référentiel fev (Fiche d''évaluation de vulnérabilités) du cnive.')}", styles['NCBody']))
    else:
        elements.append(Paragraph(format_general("Aucune donnée d'évaluation disponible pour cet élève."), styles['NCBody']))
        
    doc.build(elements)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=vulnerabilite_{pupil.cnive_id}.pdf"})

def generate_health_report(pupil_id: str, db: Session, report_type: str = ReportType.HEALTH_SUMMARY):
    """Report 3: Dossier Santé (Summary vs Vaccines)"""
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil: raise HTTPException(status_code=404, detail="Élève non trouvé")
    hr = db.query(models.HealthRecord).filter(models.HealthRecord.pupil_id == pupil_id).first()
    vaccines = db.query(models.Vaccination).filter(models.Vaccination.pupil_id == pupil_id).all()
    
    styles = get_nc_styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm)
    elements = []
    
    is_vaccines = report_type == ReportType.HEALTH_DETAILED
    subtitle = format_general("Historique des vaccinations") if is_vaccines else format_general("État de santé général")
    add_header(elements, format_general("Dossier de santé & vaccinations"), f"{subtitle} - {format_name(pupil.first_name)} {format_name(pupil.last_name)}")
    
    # 1. General Info (Always present)
    elements.append(Paragraph(format_general("1. État de santé général & alertes"), styles['NCHeading']))
    cmu_display = format_name(CMU_STATUS_MAP.get(hr.cmu_status, hr.cmu_status) if hr else "Non renseigné")
    h_data = [
        [Paragraph(f"<b>{format_general('Groupe sanguin')}</b>", styles['NCBody']), format_name(hr.blood_group if hr else "N/A"), Paragraph(f"<b>{format_general('Enrôlement cmu')}</b>", styles['NCBody']), cmu_display],
        [Paragraph(f"<b>{format_general('Allergies')}</b>", styles['NCBody']), Paragraph(format_general(hr.allergies or "Aucune connue"), styles['NCBody']), Paragraph(f"<b>{format_general('Maladies chroniques')}</b>", styles['NCBody']), Paragraph(format_general(hr.chronic_conditions or "Aucune"), styles['NCBody'])]
    ]
    ht = Table(h_data, colWidths=[4.5*cm, 4.2*cm, 4.5*cm, 4.2*cm])
    ht.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (0,-1), NC_LIGHT_GRAY), ('BACKGROUND', (2,0), (2,-1), NC_LIGHT_GRAY), ('PADDING', (0,0), (-1,-1), 8), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
    elements.append(ht)
    
    if hr and (hr.allergies or hr.chronic_conditions):
        elements.append(Spacer(1, 0.3*cm))
        alert_t = Table([[Paragraph(f"<b>⚠️ {format_general('Vigilance médicale requise')}</b>", ParagraphStyle('A', textColor=colors.white, alignment=TA_CENTER))]], colWidths=[17.4*cm])
        alert_t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#D32F2F')), ('ROUNDEDCORNERS', [5,5,5,5])]))
        elements.append(alert_t)

    if is_vaccines:
        # 2. Vaccination History
        elements.append(Spacer(1, 0.8*cm))
        elements.append(Paragraph(format_general("2. Historique des vaccinations"), styles['NCHeading']))
        if not vaccines:
            elements.append(Paragraph(format_general("Aucun vaccin enregistré dans le carnet numérique."), styles['NCBody']))
        else:
            v_data = [[Paragraph(f"<b>{format_general('Vaccin')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Dose')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Date')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Structure / responsable')}</b>", styles['NCBody'])]]
            for v in vaccines:
                v_data.append([format_name(v.vaccine_name), f"Dose {v.dose_number}", v.administered_date.strftime('%d/%m/%Y') if v.administered_date else "N/A", f"{format_name(v.facility or 'N/A')}\n{format_name(v.administered_by or '')}"])
            vt = Table(v_data, colWidths=[4.5*cm, 2*cm, 3*cm, 7.9*cm])
            vt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (-1,0), NC_LIGHT_TEAL), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('PADDING', (0,0), (-1,-1), 6)]))
            elements.append(vt)
    
    doc.build(elements)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=sante_{pupil.cnive_id}.pdf"})

def generate_school_report(school_id: str, db: Session, report_type: str = ReportType.SCHOOL_SUMMARY_BASIC):
    """Report 4: Synthèse École (Basic vs Global Stats) with fixed layout"""
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school: raise HTTPException(status_code=404, detail="École non trouvée")
    pupils = db.query(models.Pupil).filter(models.Pupil.school_id == school.id).all()
    
    styles = get_nc_styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    elements = []
    
    is_global = report_type == ReportType.SCHOOL_SUMMARY_GLOBAL
    subtitle = format_general("Rapport statistique de performance") if is_global else format_general("Résumé de l'établissement")
    add_header(elements, f"{format_general('Synthèse établissement:')} {format_name(school.name)}", f"{subtitle} - Code: {school.code}")
    
    # 1. School Info & Key Stats
    elements.append(Paragraph(format_general("1. Indicateurs de performance global"), styles['NCHeading']))
    total = len(pupils)
    boys = len([p for p in pupils if p.gender == 'M'])
    girls = len([p for p in pupils if p.gender == 'F'])
    
    stats_data = [
        [Paragraph(f"<b>{format_general('Total élèves')}</b>", styles['NCBody']), str(total), 
         Paragraph(f"<b>{format_general('Garçons')}</b>", styles['NCBody']), f"{boys} ({round(boys/total*100,1) if total>0 else 0}%)"],
        [Paragraph(f"<b>{format_general('Localisation')}</b>", styles['NCBody']), Paragraph(format_name(school.city or "N/A"), styles['NCBody']), 
         Paragraph(f"<b>{format_general('Filles')}</b>", styles['NCBody']), f"{girls} ({round(girls/total*100,1) if total>0 else 0}%)"]
    ]
    st = Table(stats_data, colWidths=[4*cm, 4.7*cm, 4*cm, 4.7*cm])
    st.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (0,-1), NC_LIGHT_TEAL), ('BACKGROUND', (2,0), (2,-1), NC_LIGHT_TEAL), ('PADDING', (0,0), (-1,-1), 8), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
    elements.append(st)
    
    if school.address:
        elements.append(Spacer(1, 0.1*cm))
        addr_t = Table([[Paragraph(f"<b>{format_general('Adresse détaillée')}</b>", styles['NCBody']), Paragraph(format_general(school.address), styles['NCBody'])]], colWidths=[4*cm, 13.4*cm])
        addr_t.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (0,0), NC_LIGHT_GRAY), ('PADDING', (0,0), (-1,-1), 8)]))
        elements.append(addr_t)
    
    if is_global:
        # 2. Risk Distribution
        elements.append(Spacer(1, 0.8*cm))
        elements.append(Paragraph(format_general("2. Distribution des niveaux de risque"), styles['NCHeading']))
        assessments = db.query(models.VulnerabilityAssessment).filter(models.VulnerabilityAssessment.pupil_id.in_([p.id for p in pupils])).all()
        latest_assessments = {}
        for a in assessments:
            if a.pupil_id not in latest_assessments or a.created_at > latest_assessments[a.pupil_id].created_at: latest_assessments[a.pupil_id] = a
        risk_counts = {"LOW": 0, "MODERATE": 0, "HIGH": 0, "CRITICAL": 0}
        for a in latest_assessments.values():
            val = a.classification.value if hasattr(a.classification, 'value') else str(a.classification)
            if val in risk_counts: risk_counts[val] += 1
        
        risk_data = [
            [Paragraph(f"<b>{format_general('Niveau')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Nombre')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Pourcentage')}</b>", styles['NCBody'])],
            [Paragraph(f"<font color='#D32F2F'><b>{format_name('Critique')}</b></font>", styles['NCBody']), str(risk_counts["CRITICAL"]), f"{round(risk_counts['CRITICAL']/total*100,1) if total>0 else 0}%"],
            [Paragraph(f"<font color='#F57C00'><b>{format_name('Élevé')}</b></font>", styles['NCBody']), str(risk_counts["HIGH"]), f"{round(risk_counts['HIGH']/total*100,1) if total>0 else 0}%"],
            [Paragraph(f"<font color='#FBC02D'><b>{format_name('Modéré')}</b></font>", styles['NCBody']), str(risk_counts["MODERATE"]), f"{round(risk_counts['MODERATE']/total*100,1) if total>0 else 0}%"],
            [Paragraph(f"<font color='#00A99D'><b>{format_name('Faible')}</b></font>", styles['NCBody']), str(risk_counts["LOW"]), f"{round(risk_counts['LOW']/total*100,1) if total>0 else 0}%"]
        ]
        rt = Table(risk_data, colWidths=[6*cm, 5.5*cm, 5.9*cm])
        rt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (-1,0), NC_LIGHT_GRAY), ('ALIGN', (1,0), (-1,-1), 'CENTER'), ('PADDING', (0,0), (-1,-1), 8)]))
        elements.append(rt)
        
        # 3. Top 5 Vulnerable Pupils
        elements.append(Spacer(1, 0.8*cm))
        elements.append(Paragraph(format_general("3. Liste des cas prioritaires (Top 5)"), styles['NCHeading']))
        sorted_v = sorted(latest_assessments.values(), key=lambda x: x.total_score, reverse=True)[:5]
        if not sorted_v:
            elements.append(Paragraph(format_general("Aucune évaluation enregistrée pour cet établissement."), styles['NCBody']))
        else:
            top_data = [[Paragraph(f"<b>{format_general('Élève')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Id cnive')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Score')}</b>", styles['NCBody']), Paragraph(f"<b>{format_general('Niveau')}</b>", styles['NCBody'])]]
            for v in sorted_v:
                p = next(p for p in pupils if p.id == v.pupil_id)
                val = v.classification.value if hasattr(v.classification, 'value') else str(v.classification)
                top_data.append([format_name(f"{p.first_name} {p.last_name}"), p.cnive_id, f"{format_score(v.total_score)}/120", format_name(VULNERABILITY_LEVEL_MAP.get(val, val))])
            tt = Table(top_data, colWidths=[6.5*cm, 4*cm, 3*cm, 3.9*cm])
            tt.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#EEEEEE')), ('PADDING', (0,0), (-1,-1), 6), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
            elements.append(tt)
    
    doc.build(elements)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=ecole_{school.code}.pdf"})

def generate_intervention_log_report(pupil_id: str, db: Session):
    """Report 5: Journal des Interventions (History of actions)"""
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil: raise HTTPException(status_code=404, detail="Élève non trouvé")
    interventions = db.query(models.Intervention).filter(models.Intervention.pupil_id == pupil.id).order_by(models.Intervention.created_at.desc()).all()
    
    styles = get_nc_styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm)
    elements = []
    add_header(elements, format_general("Journal des interventions"), f"{format_general('Historique des actions')} - {format_name(pupil.first_name)} {format_name(pupil.last_name)}")
    
    if not interventions:
        elements.append(Paragraph(format_general("Aucune intervention enregistrée pour ce bénéficiaire."), styles['NCBody']))
    else:
        for i in interventions:
            i_data = [
                [Paragraph(f"<b>{format_name(i.title)}</b>", styles['NCBody']), Paragraph(f"{format_general('Date:')} {i.created_at.strftime('%d/%m/%Y')}", styles['NCBody'])],
                [Paragraph(format_general(i.description or "Pas de description."), styles['NCBody']), ""]
            ]
            it = Table(i_data, colWidths=[13*cm, 4*cm])
            it.setStyle(TableStyle([('SPAN', (0,1), (1,1)), ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E0E0E0')), ('BACKGROUND', (0,0), (-1,0), NC_LIGHT_GRAY), ('PADDING', (0,0), (-1,-1), 8), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
            elements.append(it)
            elements.append(Spacer(1, 0.4*cm))
            
    doc.build(elements)
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=interventions_{pupil.cnive_id}.pdf"})

# --- Endpoints ---

@router.post("/generate")
def generate_report(
    request: ReportRequest, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    req: Request = None
):
    """Generate a PDF report (CDC F5.2)"""
    log_action(
        db, models.AuditActionType.GENERATE_REPORT,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="report",
        resource_id=request.entity_id,
        ip_address=req.client.host if req and req.client else None,
        metadata={"report_type": request.report_type}
    )
    
    if not REPORTLAB_AVAILABLE:
        return generate_json_report(request, db)
    
    rt = request.report_type
    if rt in [ReportType.PUPIL_PROFILE_FULL, ReportType.PUPIL_PROFILE_PERSONAL]:
        return generate_pupil_report(request.entity_id, db, rt)
    elif rt in [ReportType.VULNERABILITY_SUMMARY, ReportType.VULNERABILITY_DETAILED]:
        return generate_vulnerability_report(request.entity_id, db, rt)
    elif rt in [ReportType.HEALTH_SUMMARY, ReportType.HEALTH_DETAILED]:
        return generate_health_report(request.entity_id, db, rt)
    elif rt in [ReportType.SCHOOL_SUMMARY_BASIC, ReportType.SCHOOL_SUMMARY_GLOBAL]:
        return generate_school_report(request.entity_id, db, rt)
    elif rt == ReportType.INTERVENTION_LOG:
        return generate_intervention_log_report(request.entity_id, db)
    else:
        # Fallback for old types if any
        if rt == "pupil_profile": return generate_pupil_report(request.entity_id, db, ReportType.PUPIL_PROFILE_FULL)
        if rt == "vulnerability": return generate_vulnerability_report(request.entity_id, db, ReportType.VULNERABILITY_DETAILED)
        if rt == "health_record": return generate_health_report(request.entity_id, db, ReportType.HEALTH_DETAILED)
        if rt == "school_summary": return generate_school_report(request.entity_id, db, ReportType.SCHOOL_SUMMARY_GLOBAL)
        
        raise HTTPException(status_code=400, detail=f"Type de rapport non supporté: {rt}")

@router.get("/types")
def get_report_types():
    return {
        "types": [
            {"id": "pupil_profile_full", "name": "Profil complet (Dossier intégral)", "icon": "👤"},
            {"id": "pupil_profile_personal", "name": "Informations personnelles (Civil & Scolaire)", "icon": "ℹ️"},
            {"id": "vulnerability_summary", "name": "Vulnérabilité (Niveau de risque global)", "icon": "⚠️"},
            {"id": "vulnerability_detailed", "name": "Vulnérabilité (Détail des 6 dimensions)", "icon": "📊"},
            {"id": "health_summary", "name": "Dossier santé (État général & Allergies)", "icon": "🏥"},
            {"id": "health_detailed", "name": "Dossier santé (Suivi médical & Vaccins)", "icon": "💉"},
            {"id": "school_summary_basic", "name": "Synthèse école (Résumé établissement)", "icon": "🏫"},
            {"id": "school_summary_global", "name": "Synthèse école (Statistiques globales)", "icon": "📈"},
            {"id": "intervention_log", "name": "Journal des Interventions", "icon": "📋"}
        ]
    }
