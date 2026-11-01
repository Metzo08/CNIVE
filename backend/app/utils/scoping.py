from sqlalchemy.orm import Query
from app.models import models
from fastapi import HTTPException, status


def apply_pupil_scope(query: Query, user: models.User) -> Query:
    """
    Applique le cloisonnement strict des données élèves selon le rôle de l'utilisateur :
    - GTE_ADMIN : Vue nationale globale (aucun filtre d'école ni de classe).
    - SCHOOL_DIRECTOR : Cloisonné strictement aux élèves de son établissement (school_id).
    - TEACHER : Cloisonné strictement aux élèves de son établissement ET de sa classe (school_id + grade).
    - SOCIAL_WORKER / HEALTH_WORKER : Si rattaché à une école, restreint à celle-ci.
    """
    if not user:
        return query.filter(models.Pupil.id == None)

    # Administrateur national GTE : visibilité totale
    if user.role == models.UserRole.GTE_ADMIN:
        return query

    # Directeur d'école : restreint aux élèves de son établissement
    if user.role == models.UserRole.SCHOOL_DIRECTOR:
        if not user.school_id:
            return query.filter(models.Pupil.id == None)
        return query.filter(models.Pupil.school_id == user.school_id)

    # Enseignant : restreint aux élèves de son établissement ET de sa classe
    if user.role == models.UserRole.TEACHER:
        if not user.school_id:
            return query.filter(models.Pupil.id == None)
        q = query.filter(models.Pupil.school_id == user.school_id)
        if user.grade:
            q = q.filter(models.Pupil.grade == user.grade)
        return q

    # Travailleur social ou santé rattaché à une structure locale
    if user.school_id:
        return query.filter(models.Pupil.school_id == user.school_id)

    return query


def verify_pupil_access(pupil: models.Pupil, user: models.User):
    """
    Contrôle d'accès unitaire pour la consultation, modification ou suppression d'un élève.
    Lève une exception 403 FORBIDDEN si l'utilisateur tente d'accéder à un élève hors de son périmètre.
    """
    if not user or not pupil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Élève non trouvé",
        )

    # Admin national : accès autorisé
    if user.role == models.UserRole.GTE_ADMIN:
        return True

    # Directeur d'école : même école requis
    if user.role == models.UserRole.SCHOOL_DIRECTOR:
        if str(pupil.school_id) != str(user.school_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès interdit : Cet élève n'appartient pas à votre établissement scolaire.",
            )
        return True

    # Enseignant : même école ET même classe requis
    if user.role == models.UserRole.TEACHER:
        if str(pupil.school_id) != str(user.school_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès interdit : Cet élève n'appartient pas à votre établissement.",
            )
        if user.grade and pupil.grade != user.grade:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès interdit : Cet élève est en classe de {pupil.grade}, votre accès est réservé à votre classe ({user.grade}).",
            )
        return True

    # Autre intervenant avec école attribuée
    if user.school_id and str(pupil.school_id) != str(user.school_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès interdit : Hors de votre secteur d'affectation.",
        )

    return True
