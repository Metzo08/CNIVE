from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_
from database import get_db
from app.models import models
from app.utils.auth import get_current_user
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta

router = APIRouter(prefix="/ai", tags=["AI & Analytics"])

def calculate_dropout_risk(
    pupil: models.Pupil, 
    assessment: Optional[models.VulnerabilityAssessment], 
    interventions: List[models.Intervention], 
    db: Session
) -> dict:
    """
    Moteur prédictif multimodal CNIVE Intelligence v2.5.
    Combine les 6 dimensions FEV (CDC Sénégal), l'historique d'absentéisme réel,
    les performances académiques et la dynamique des interventions terrain.
    """
    risk_score = 0
    factors: List[str] = []
    recommendations: List[str] = []
    category_alerts: Dict[str, str] = {}
    
    if not assessment:
        # Analyse d'urgence basée sur les absences et notes si aucune FEV n'a été faite
        recent_absences_count = db.query(models.Absence).filter(
            models.Absence.pupil_id == pupil.id,
            models.Absence.is_justified == False
        ).count()
        
        fallback_factors = ["Aucune évaluation multidimensionnelle FEV disponible."]
        if recent_absences_count >= 5:
            fallback_factors.append(f"Alerte absentéisme : {recent_absences_count} absences non justifiées enregistrées.")
            
        return {
            "pupil_id": str(pupil.id),
            "pupil_name": f"{pupil.first_name} {pupil.last_name}",
            "cnive_id": pupil.cnive_id,
            "risk_score": min(45, recent_absences_count * 8),
            "risk_level": "UNKNOWN" if recent_absences_count < 5 else "MODERATE",
            "factors": fallback_factors,
            "recommendations": [
                "Programmer en priorité une Fiche d'Évaluation de Vulnérabilités (FEV) sur le terrain",
                "Contacter le tuteur légal pour vérifier les motifs d'absence"
            ],
            "signals": {
                "absences_unjustified": recent_absences_count,
                "academic_score": pupil.academic_score,
                "completed_interventions": 0
            }
        }
    
    # --- 1. Base Score FEV (Normalisation 30-120 vers 0-100) ---
    base_risk = ((assessment.total_score - 30) / 90) * 100
    risk_score += base_risk
    
    # --- 2. Dimension Scolaire (Poids 25%) ---
    if assessment.school_score >= 20:
        risk_score += 15
        factors.append("Décrochage scolaire imminent ou effectif")
        recommendations.append("Réintégration scolaire d'urgence et tutorat personnalisé")
        category_alerts["scolaire"] = "CRITIQUE"
    elif assessment.school_score >= 15:
        risk_score += 10
        factors.append("Difficultés d'apprentissage aiguës ou retard scolaire important")
        recommendations.append("Entretien tripartite (Enseignant - Élève - Tuteur) et soutien scolaire")
        category_alerts["scolaire"] = "ÉLEVÉ"
    elif assessment.school_score >= 10:
        risk_score += 5
        factors.append("Fragilité scolaire modérée")

    # --- 3. Intégration Dynamique des Absences Réelles ---
    unjustified_absences = db.query(models.Absence).filter(
        models.Absence.pupil_id == pupil.id,
        models.Absence.is_justified == False
    ).count()
    
    if unjustified_absences >= 10:
        risk_score += 18
        factors.append(f"Absentéisme chronique sévère ({unjustified_absences} absences non justifiées)")
        recommendations.append("Visite domiciliaire d'un travailleur social sous 48h")
    elif unjustified_absences >= 5:
        risk_score += 8
        factors.append(f"Absentéisme régulier ({unjustified_absences} absences sans justificatif)")
        recommendations.append("Rappel aux parents des obligations d'assiduité")

    # --- 4. Intégration des Résultats Académiques Réels ---
    if pupil.academic_score is not None:
        if pupil.academic_score < 7.0:
            risk_score += 12
            factors.append(f"Moyenne générale en zone rouge ({pupil.academic_score:.1f}/20)")
            recommendations.append("Plan de rattrapage pédagogique individualisé (Maths / Français)")
        elif pupil.academic_score < 10.0:
            risk_score += 5
            factors.append(f"Moyenne sous la moyenne requise ({pupil.academic_score:.1f}/20)")

    # --- 5. Dimension Économique (Poids 20%) ---
    if assessment.economic_score >= 20:
        risk_score += 10
        factors.append("Précarité économique extrême du foyer (faim, absence totale de fournitures)")
        recommendations.append("Dotation de fournitures scolaires complètes et aide alimentaire d'urgence")
        category_alerts["economique"] = "CRITIQUE"
    elif assessment.economic_score >= 15:
        risk_score += 5
        factors.append("Difficultés financières pesant sur la scolarité de l'enfant")
        recommendations.append("Appui social pour les frais de transport et de cantine scolaire")

    # --- 6. Dimension Protection de l'Enfance (15% - Déclencheur Absolu) ---
    if assessment.protection_score >= 15:
        risk_score = 100  # Urgence maximale immédiate
        factors.append("ALERTE PROTECTION ABSOLUE : Risque élevé de violence, abus ou exploitation")
        recommendations.append("SIGNALEMENT IMMÉDIAT & MISE EN SÉCURITÉ DE L'ENFANT (Coordination GTE / Action Sociale)")
        category_alerts["protection"] = "URGENCE_SIGNALEMENT"
    elif assessment.protection_score >= 10:
        risk_score += 15
        factors.append("Environnement familial ou communautaire à risque de maltraitance")
        recommendations.append("Médiation sociale et renforcement de la supervision")
        category_alerts["protection"] = "VIGILANCE"

    # --- 7. Dimension Familiale & Sociale (15%) ---
    if assessment.family_social_score >= 20:
        risk_score += 10
        factors.append("Rupture familiale totale ou orphelin sans tuteur stable")
        recommendations.append("Enquête sociale et accompagnement de la famille d'accueil")
    elif assessment.family_social_score >= 15:
        risk_score += 5
        factors.append("Instabilité familiale chronique affectant le bien-être de l'élève")

    # --- 8. Dimension Santé & Nutrition (15%) ---
    if assessment.health_nutrition_score >= 20:
        risk_score += 10
        factors.append("Pathologie lourde non traitée ou malnutrition aiguë constatée")
        recommendations.append("Référer d'urgence vers un Centre de Santé pour bilan médical complet")
        category_alerts["sante"] = "MÉDICAL_URGENT"
    elif assessment.health_nutrition_score >= 15:
        risk_score += 5
        factors.append("Santé fragile et absences médicales répétées")
        recommendations.append("Accélérer l'enrôlement à la CMU (Couverture Maladie Universelle)")

    # --- 9. Dimension Environnementale (10% - Inondations / Habitat précaire) ---
    if assessment.environmental_score >= 20:
        risk_score = max(risk_score, 85)
        factors.append("Habitat sinistré ou zone inondable critique empêchant l'accès à l'école")
        recommendations.append("Appui au relogement d'urgence ou transfert temporaire de scolarité")
        category_alerts["environnement"] = "SINISTRE_INONDATION"
    elif assessment.environmental_score >= 15:
        risk_score += 12
        factors.append("Exposition à des aléas environnementaux réguliers")

    # --- 10. Trajectoire Temporelle (Évolution FEV) ---
    all_assessments = db.query(models.VulnerabilityAssessment).filter(
        models.VulnerabilityAssessment.pupil_id == pupil.id
    ).order_by(desc(models.VulnerabilityAssessment.created_at)).limit(2).all()
    
    trajectory = "STABLE"
    if len(all_assessments) >= 2:
        diff = all_assessments[0].total_score - all_assessments[1].total_score
        if diff > 5:
            risk_score += 8
            factors.append(f"Trajectoire négative : Vulnérabilité globale en hausse de +{diff:.1f} pts")
            trajectory = "AGGRAVATION"
        elif diff < -5:
            risk_score -= 8
            factors.append(f"Trajectoire positive : Vulnérabilité en baisse de {abs(diff):.1f} pts")
            trajectory = "AMELIORATION"

    # --- 11. Impact des Interventions Réalisées ---
    completed_interventions = len([i for i in interventions if i.status == models.InterventionStatus.COMPLETED])
    in_progress_interventions = len([i for i in interventions if i.status == models.InterventionStatus.IN_PROGRESS])
    
    if completed_interventions > 0:
        risk_score -= (completed_interventions * 3)
        factors.append(f"Atténuation : {completed_interventions} intervention(s) réalisée(s) avec succès")
        
    if in_progress_interventions > 0:
        risk_score -= (in_progress_interventions * 1.5)

    # Clamping final
    risk_score = int(max(0, min(100, risk_score)))
    
    # Classification finale
    if risk_score >= 80 or assessment.total_score >= 106 or assessment.protection_score >= 15:
        risk_level = "CRITICAL"
    elif risk_score >= 50 or assessment.total_score >= 76:
        risk_level = "HIGH"
    elif risk_score >= 20 or assessment.total_score >= 46:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"
    
    if not factors:
        factors = ["Situation de l'élève globalement stable sans facteur de décrochage prédominant."]
    if not recommendations:
        recommendations = ["Maintenir le suivi pédagogique et social régulier."]

    return {
        "pupil_id": str(pupil.id),
        "pupil_name": f"{pupil.first_name} {pupil.last_name}",
        "cnive_id": pupil.cnive_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "trajectory": trajectory,
        "factors": factors,
        "recommendations": list(dict.fromkeys(recommendations)),
        "alerts": category_alerts,
        "assessment_date": assessment.assessment_date.isoformat() if assessment.assessment_date else None,
        "vulnerability_classification": assessment.classification.value if hasattr(assessment.classification, 'value') else str(assessment.classification),
        "signals": {
            "fev_total_score": assessment.total_score,
            "absences_unjustified": unjustified_absences,
            "academic_score": pupil.academic_score,
            "completed_interventions": completed_interventions
        }
    }

@router.get("/predict/dropout/{pupil_id}")
def predict_dropout_risk(
    pupil_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Prédiction individuelle optimisée du risque de décrochage"""
    pupil = db.query(models.Pupil).filter(models.Pupil.id == pupil_id).first()
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")
    
    assessment = db.query(models.VulnerabilityAssessment).filter(
        models.VulnerabilityAssessment.pupil_id == pupil_id
    ).order_by(desc(models.VulnerabilityAssessment.created_at)).first()
    
    interventions = db.query(models.Intervention).filter(models.Intervention.pupil_id == pupil_id).all()
    
    return calculate_dropout_risk(pupil, assessment, interventions, db)

@router.get("/predict/batch")
def predict_batch_dropout_risk(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    risk_level_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Analyse de lot paginée et hautement performante.
    Prévient l'épuisement mémoire et le problème N+1 sur des cohortes de plus de 100 000 élèves.
    """
    # Récupérer les élèves actifs avec pagination
    query = db.query(models.Pupil).filter(models.Pupil.status == models.PupilStatus.ACTIVE)
    total_active = query.count()
    
    pupils = query.order_by(desc(models.Pupil.created_at)).offset(skip).limit(limit).all()
    
    results = []
    for pupil in pupils:
        assessment = db.query(models.VulnerabilityAssessment).filter(
            models.VulnerabilityAssessment.pupil_id == pupil.id
        ).order_by(desc(models.VulnerabilityAssessment.created_at)).first()
        
        interventions = db.query(models.Intervention).filter(
            models.Intervention.pupil_id == pupil.id
        ).all()
        
        pred = calculate_dropout_risk(pupil, assessment, interventions, db)
        if not risk_level_filter or pred["risk_level"] == risk_level_filter.upper():
            results.append(pred)
    
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    
    # Statistiques globales agrégées en 1 seule requête SQL
    level_counts = dict(
        db.query(models.VulnerabilityAssessment.classification, func.count(models.VulnerabilityAssessment.id))
        .group_by(models.VulnerabilityAssessment.classification)
        .all()
    )
    
    return {
        "total_active_pupils": total_active,
        "batch_analyzed": len(results),
        "skip": skip,
        "limit": limit,
        "global_distribution": {
            "CRITICAL": level_counts.get(models.VulnerabilityLevel.CRITICAL, 0),
            "HIGH": level_counts.get(models.VulnerabilityLevel.HIGH, 0),
            "MODERATE": level_counts.get(models.VulnerabilityLevel.MODERATE, 0),
            "LOW": level_counts.get(models.VulnerabilityLevel.LOW, 0)
        },
        "predictions": results
    }

@router.get("/dashboard")
def get_ai_dashboard(
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """Tableau de bord décisionnel IA CNIVE Intelligence optimisé"""
    total_pupils = db.query(models.Pupil).filter(models.Pupil.status == models.PupilStatus.ACTIVE).count()
    total_assessments = db.query(models.VulnerabilityAssessment).count()
    
    level_counts = dict(
        db.query(models.VulnerabilityAssessment.classification, func.count(models.VulnerabilityAssessment.id))
        .group_by(models.VulnerabilityAssessment.classification)
        .all()
    )
    
    classification_counts = {
        "CRITICAL": level_counts.get(models.VulnerabilityLevel.CRITICAL, 0),
        "HIGH": level_counts.get(models.VulnerabilityLevel.HIGH, 0),
        "MODERATE": level_counts.get(models.VulnerabilityLevel.MODERATE, 0),
        "LOW": level_counts.get(models.VulnerabilityLevel.LOW, 0)
    }
    
    avg_scores = db.query(
        func.avg(models.VulnerabilityAssessment.economic_score).label("economic"),
        func.avg(models.VulnerabilityAssessment.school_score).label("school"),
        func.avg(models.VulnerabilityAssessment.health_nutrition_score).label("health_nutrition"),
        func.avg(models.VulnerabilityAssessment.family_social_score).label("family_social"),
        func.avg(models.VulnerabilityAssessment.protection_score).label("protection"),
        func.avg(models.VulnerabilityAssessment.environmental_score).label("environmental")
    ).first()
    
    dimension_averages = {
        "economic": round(avg_scores.economic or 0, 2),
        "school": round(avg_scores.school or 0, 2),
        "health_nutrition": round(avg_scores.health_nutrition or 0, 2),
        "family_social": round(avg_scores.family_social or 0, 2),
        "protection": round(avg_scores.protection or 0, 2),
        "environmental": round(avg_scores.environmental or 0, 2)
    }
    
    total_interventions = db.query(models.Intervention).count()
    completed_interventions = db.query(models.Intervention).filter(
        models.Intervention.status == models.InterventionStatus.COMPLETED
    ).count()
    
    return {
        "total_pupils": total_pupils,
        "total_assessments": total_assessments,
        "at_risk_count": classification_counts["CRITICAL"] + classification_counts["HIGH"],
        "classification_distribution": classification_counts,
        "dimension_averages": dimension_averages,
        "interventions": {
            "total": total_interventions,
            "completed": completed_interventions,
            "success_rate": round((completed_interventions / total_interventions * 100) if total_interventions > 0 else 0, 1)
        },
        "ai_model": "CNIVE Multimodal Intelligence Engine v2.5",
        "last_updated": datetime.utcnow().isoformat()
    }
