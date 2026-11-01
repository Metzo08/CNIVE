from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from pydantic import BaseModel, validator
from database import get_db
from app.models import models
from app.utils.scoring import (
    assess_vulnerability,
    VULNERABILITY_REFERENCE,
    VULNERABILITY_SCALE,
)
from app.utils.auth import get_current_user
from app.routers.audit import log_action
import uuid
import json
from datetime import date

router = APIRouter(prefix="/vulnerabilities", tags=["Vulnerability Assessment"])


# Schémas Pydantic adaptés au FEV
class DimensionScoresFEV(BaseModel):
    economic: int = 1
    school: int = 1
    health_nutrition: int = 1
    family_social: int = 1
    protection: int = 1
    environmental: int = 1


class AssessmentCreate(BaseModel):
    pupil_id: uuid.UUID
    assessor_id: uuid.UUID
    scores: DimensionScoresFEV
    comments: Optional[str] = None


class AssessmentResponse(BaseModel):
    id: uuid.UUID
    pupil_id: uuid.UUID
    assessor_id: uuid.UUID
    economic_score: int
    school_score: int
    health_nutrition_score: int
    family_social_score: int
    protection_score: int
    environmental_score: int
    total_score: float
    classification: str
    comments: Optional[str]
    assessment_date: date
    raw_scores: Optional[Dict] = None

    @validator("raw_scores", pre=True)
    def parse_raw_scores(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return None
        return v

    class Config:
        from_attributes = True


@router.get("/criteria")
def get_vulnerability_criteria():
    """Retourne le nouveau référentiel FEV"""
    return {
        "reference": VULNERABILITY_REFERENCE,
        "scale": VULNERABILITY_SCALE,
        "classification_thresholds": {
            "LOW": "30-45",
            "MODERATE": "46-75",
            "HIGH": "76-105",
            "CRITICAL": "106-120",
        },
    }


@router.post("/assess")
def create_assessment(
    assessment: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    """
    Crée une nouvelle évaluation FEV
    """
    pupil = (
        db.query(models.Pupil).filter(models.Pupil.id == assessment.pupil_id).first()
    )
    if not pupil:
        raise HTTPException(status_code=404, detail="Élève non trouvé")

    scores_dict = assessment.scores.dict()
    result = assess_vulnerability(scores_dict)

    new_assessment = models.VulnerabilityAssessment(
        pupil_id=assessment.pupil_id,
        assessor_id=assessment.assessor_id,
        economic_score=result["dimension_scores"]["economic"],
        school_score=result["dimension_scores"]["school"],
        health_nutrition_score=result["dimension_scores"]["health_nutrition"],
        family_social_score=result["dimension_scores"]["family_social"],
        protection_score=result["dimension_scores"]["protection"],
        environmental_score=result["dimension_scores"]["environmental"],
        total_score=result["total_score"],
        classification=result["classification"],
        raw_scores=json.dumps(scores_dict),
        comments=assessment.comments,
    )

    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    log_action(
        db,
        models.AuditActionType.EDIT_VULNERABILITY,
        user_id=str(current_user.id),
        user_email=current_user.email,
        resource_type="vulnerability_assessment",
        resource_id=str(assessment.pupil_id),
        ip_address=request.client.host if request and request.client else None,
        metadata={"classification": result["classification"], "model": "FEV"},
    )

    return {
        "assessment": new_assessment,
        "critical_criteria": result["critical_criteria"],
    }


@router.get("/pupil/{pupil_id}/latest")
def get_pupil_latest_assessment(
    pupil_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    request: Request = None,
):
    assessment = (
        db.query(models.VulnerabilityAssessment)
        .filter(models.VulnerabilityAssessment.pupil_id == pupil_id)
        .order_by(models.VulnerabilityAssessment.created_at.desc())
        .first()
    )

    if not assessment:
        raise HTTPException(status_code=404, detail="Aucune évaluation trouvée")

    return {
        "id": str(assessment.id),
        "pupil_id": str(assessment.pupil_id),
        "economic_score": assessment.economic_score,
        "school_score": assessment.school_score,
        "health_nutrition_score": assessment.health_nutrition_score,
        "family_social_score": assessment.family_social_score,
        "protection_score": assessment.protection_score,
        "environmental_score": assessment.environmental_score,
        "total_score": assessment.total_score,
        "classification": (
            assessment.classification.value
            if hasattr(assessment.classification, "value")
            else str(assessment.classification)
        ),
        "assessment_date": (
            assessment.assessment_date.isoformat()
            if assessment.assessment_date
            else None
        ),
        "raw_scores": (
            json.loads(assessment.raw_scores) if assessment.raw_scores else None
        ),
    }


@router.get("/{pupil_id}", response_model=List[AssessmentResponse])
def get_pupil_assessments(pupil_id: uuid.UUID, db: Session = Depends(get_db)):
    return (
        db.query(models.VulnerabilityAssessment)
        .filter(models.VulnerabilityAssessment.pupil_id == pupil_id)
        .order_by(models.VulnerabilityAssessment.assessment_date.desc())
        .all()
    )


@router.get("/stats/overview")
def get_vulnerability_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func

    total_pupils = db.query(models.Pupil).count()
    stats = (
        db.query(
            models.VulnerabilityAssessment.classification,
            func.count(models.VulnerabilityAssessment.id),
        )
        .group_by(models.VulnerabilityAssessment.classification)
        .all()
    )

    classification_counts = {
        s[0].value if hasattr(s[0], "value") else str(s[0]): s[1] for s in stats
    }

    return {
        "total_pupils": total_pupils,
        "assessed_pupils": sum(classification_counts.values()),
        "by_classification": {
            "LOW": classification_counts.get("LOW", 0),
            "MODERATE": classification_counts.get("MODERATE", 0),
            "HIGH": classification_counts.get("HIGH", 0),
            "CRITICAL": classification_counts.get("CRITICAL", 0),
        },
    }
