from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
import uuid
from app.models.models import (
    UserRole,
    PupilStatus,
    VulnerabilityLevel,
    CardStatus,
    InterventionStatus,
)


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole
    school_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = True


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None


class PupilBase(BaseModel):
    first_name: str
    last_name: str
    birth_date: date
    gender: str
    national_id: Optional[str] = None
    address: Optional[str] = None
    contact_parent1_name: Optional[str] = None
    contact_parent1_phone: Optional[str] = None
    contact_parent2_name: Optional[str] = None
    contact_parent2_phone: Optional[str] = None
    grade: Optional[str] = None
    academic_score: Optional[float] = None


class AcademicRecordBase(BaseModel):
    subject: str
    score: float
    base_score: int = 20
    term: Optional[str] = None


class AcademicRecordCreate(AcademicRecordBase):
    pass


class AcademicRecordList(BaseModel):
    records: List[AcademicRecordCreate]


class AcademicRecordResponse(AcademicRecordBase):
    id: uuid.UUID
    pupil_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class PupilCreate(PupilBase):
    school_id: uuid.UUID


class PupilResponse(PupilBase):
    id: uuid.UUID
    cnive_id: Optional[str] = None
    school_id: uuid.UUID
    status: PupilStatus
    photo_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PupilMini(BaseModel):
    id: uuid.UUID
    cnive_id: str
    first_name: str
    last_name: str

    class Config:
        from_attributes = True


class HealthRecordResponse(BaseModel):
    id: uuid.UUID
    pupil_id: uuid.UUID
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    cmu_status: str
    cmu_number: Optional[str] = None
    health_facility: Optional[str] = None
    is_archived: bool
    created_at: Optional[datetime] = None
    pupil: Optional[PupilMini] = None

    class Config:
        from_attributes = True


class AbsenceBase(BaseModel):
    pupil_id: uuid.UUID
    date: date
    reason: str
    is_justified: bool = False
    duration_days: int = 1
    notes: Optional[str] = None


class AbsenceCreate(AbsenceBase):
    pass


class AbsenceResponse(AbsenceBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class VaccinationResponse(BaseModel):
    id: uuid.UUID
    pupil_id: uuid.UUID
    vaccine_name: str
    dose_number: int
    administered_date: date
    next_due_date: Optional[date] = None
    administered_by: Optional[str] = None
    facility: Optional[str] = None
    created_at: Optional[datetime] = None
    pupil: Optional[PupilMini] = None

    class Config:
        from_attributes = True


class ConsultationResponse(BaseModel):
    id: uuid.UUID
    pupil_id: uuid.UUID
    consultation_date: date
    consultation_type: str
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    prescriptions: Optional[str] = None
    practitioner: Optional[str] = None
    facility: Optional[str] = None
    follow_up_date: Optional[date] = None
    created_at: Optional[datetime] = None
    pupil: Optional[PupilMini] = None

    class Config:
        from_attributes = True


class AssessmentBase(BaseModel):
    pupil_id: uuid.UUID
    economic_score: int
    school_score: int
    health_score: int
    social_score: int
    violence_score: int
    comments: Optional[str] = None


class AssessmentCreate(AssessmentBase):
    assessor_id: uuid.UUID


class AssessmentResponse(AssessmentBase):
    id: uuid.UUID
    total_score: float
    classification: VulnerabilityLevel
    assessment_date: date
    created_at: datetime

    class Config:
        from_attributes = True
