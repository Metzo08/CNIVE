from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
    Date,
    Float,
    Enum as SQLAlchemyEnum,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base
import uuid
from enum import Enum


class UserRole(str, Enum):
    GTE_ADMIN = "GTE_ADMIN"
    SCHOOL_DIRECTOR = "SCHOOL_DIRECTOR"
    SOCIAL_WORKER = "SOCIAL_WORKER"
    HEALTH_WORKER = "HEALTH_WORKER"
    TEACHER = "TEACHER"


class PupilStatus(str, Enum):
    ACTIVE = "ACTIVE"
    TRANSFERRED = "TRANSFERRED"
    DROPOUT = "DROPOUT"


class VulnerabilityLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class InterventionStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CardStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    LOST = "LOST"


class AuditActionType(str, Enum):
    LOGIN = "LOGIN"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    SYSTEM = "SYSTEM"
    MFA_SETUP = "MFA_SETUP"
    MFA_VERIFIED = "MFA_VERIFIED"
    CREATE_PUPIL = "CREATE_PUPIL"
    EDIT_PUPIL = "EDIT_PUPIL"
    VIEW_PUPIL = "VIEW_PUPIL"
    DELETE_PUPIL = "DELETE_PUPIL"
    VIEW_HEALTH = "VIEW_HEALTH"
    EDIT_HEALTH = "EDIT_HEALTH"
    EDIT_VULNERABILITY = "EDIT_VULNERABILITY"
    GENERATE_REPORT = "GENERATE_REPORT"
    CREATE_INTERVENTION = "CREATE_INTERVENTION"
    EDIT_INTERVENTION = "EDIT_INTERVENTION"
    VIEW_INTERVENTION = "VIEW_INTERVENTION"
    REFERRAL = "REFERRAL"
    CARD_PRINT = "CARD_PRINT"
    CARD_SCAN = "CARD_SCAN"
    VIEW_TEAM = "VIEW_TEAM"
    CREATE_TEAM = "CREATE_TEAM"
    EDIT_TEAM = "EDIT_TEAM"
    DELETE_TEAM = "DELETE_TEAM"
    VIEW_AUDIT_LOG = "VIEW_AUDIT_LOG"
    MARK_ABSENCE = "MARK_ABSENCE"


class School(Base):
    __tablename__ = "schools"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    address = Column(String(200))
    city = Column(String(50), default="Pikine", index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    pupils = relationship("Pupil", back_populates="school")


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(50))
    last_name = Column(String(50))
    role = Column(SQLAlchemyEnum(UserRole), default=UserRole.SOCIAL_WORKER, index=True)
    school_id = Column(
        UUID(as_uuid=True), ForeignKey("schools.id"), nullable=True, index=True
    )
    grade = Column(String(20), nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(32))
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    school = relationship("School")


class Pupil(Base):
    __tablename__ = "pupils"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cnive_id = Column(String(50), unique=True, nullable=False, index=True)
    national_id = Column(String(50), unique=True, nullable=True, index=True)
    first_name = Column(String(50), nullable=False, index=True)
    last_name = Column(String(50), nullable=False, index=True)
    birth_date = Column(Date, nullable=False)
    gender = Column(String(1), index=True)
    address = Column(String(200))
    grade = Column(String(20), index=True)
    status = Column(SQLAlchemyEnum(PupilStatus), default=PupilStatus.ACTIVE, index=True)
    academic_score = Column(Float)  # Note moyenne 0-20
    photo_url = Column(String(255))

    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), index=True)
    school = relationship("School", back_populates="pupils")

    contact_parent1_name = Column(String(100))
    contact_parent1_phone = Column(String(20))
    contact_parent2_name = Column(String(100))
    contact_parent2_phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    health_record = relationship(
        "HealthRecord",
        back_populates="pupil",
        uselist=False,
        cascade="all, delete-orphan",
    )
    assessments = relationship(
        "VulnerabilityAssessment", back_populates="pupil", cascade="all, delete-orphan"
    )
    interventions = relationship(
        "Intervention", back_populates="pupil", cascade="all, delete-orphan"
    )
    academic_records = relationship(
        "AcademicRecord", back_populates="pupil", cascade="all, delete-orphan"
    )
    absences = relationship(
        "Absence", back_populates="pupil", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_pupils_school_status", "school_id", "status"),
        Index("idx_pupils_name", "last_name", "first_name"),
    )


class Absence(Base):
    __tablename__ = "absences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True), ForeignKey("pupils.id", ondelete="CASCADE"), index=True
    )
    date = Column(Date, default=func.current_date(), index=True)
    reason = Column(String(255))
    is_justified = Column(Boolean, default=False)
    duration_days = Column(Integer, default=1)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pupil = relationship("Pupil", back_populates="absences")

    __table_args__ = (Index("idx_absences_pupil_date", "pupil_id", "date"),)


class AcademicRecord(Base):
    __tablename__ = "academic_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True), ForeignKey("pupils.id", ondelete="CASCADE"), index=True
    )
    subject = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    base_score = Column(Integer, default=20)
    term = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    pupil = relationship("Pupil", back_populates="academic_records")


class HealthRecord(Base):
    __tablename__ = "health_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pupils.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    blood_group = Column(String(5))
    allergies = Column(Text)
    chronic_conditions = Column(Text)
    cmu_status = Column(String(20), default="not_enrolled", index=True)
    cmu_number = Column(String(50))
    health_facility = Column(String(100), index=True)
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    pupil = relationship("Pupil", back_populates="health_record")


class Vaccination(Base):
    __tablename__ = "vaccinations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True), ForeignKey("pupils.id", ondelete="CASCADE"), index=True
    )
    vaccine_name = Column(String(100), nullable=False)
    dose_number = Column(Integer, default=1)
    administered_date = Column(Date, default=func.current_date(), index=True)
    next_due_date = Column(Date)
    facility = Column(String(100))
    administered_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pupil = relationship("Pupil")


class Consultation(Base):
    __tablename__ = "consultations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True), ForeignKey("pupils.id", ondelete="CASCADE"), index=True
    )
    reason = Column(String(200))
    consultation_type = Column(String(100))
    diagnosis = Column(Text)
    treatment = Column(Text)
    prescriptions = Column(Text)
    consultation_date = Column(Date, default=func.current_date(), index=True)
    follow_up_date = Column(Date)
    facility = Column(String(100))
    practitioner = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pupil = relationship("Pupil")


class VulnerabilityAssessment(Base):
    __tablename__ = "vulnerability_assessments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True), ForeignKey("pupils.id", ondelete="CASCADE"), index=True
    )
    assessor_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    # Dimensions FEV CDC (Échelle 5, 10, 15, 20)
    economic_score = Column(Integer, default=5)
    school_score = Column(Integer, default=5)
    health_nutrition_score = Column(Integer, default=5)
    family_social_score = Column(Integer, default=5)
    protection_score = Column(Integer, default=5)
    environmental_score = Column(Integer, default=5)

    total_score = Column(Float, default=30, index=True)  # Min 30, Max 120
    classification = Column(
        SQLAlchemyEnum(VulnerabilityLevel), default=VulnerabilityLevel.LOW, index=True
    )
    raw_scores = Column(Text, nullable=True)
    comments = Column(Text)
    assessment_date = Column(Date, default=func.current_date(), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    pupil = relationship("Pupil", back_populates="assessments")

    __table_args__ = (Index("idx_assessments_pupil_created", "pupil_id", "created_at"),)


class Intervention(Base):
    __tablename__ = "interventions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True), ForeignKey("pupils.id", ondelete="CASCADE"), index=True
    )
    title = Column(String(100))
    type = Column(String(50), index=True)
    description = Column(Text)
    status = Column(
        SQLAlchemyEnum(InterventionStatus),
        default=InterventionStatus.PENDING,
        index=True,
    )
    priority = Column(String(20), default="medium", index=True)
    assigned_to = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    start_date = Column(Date)
    end_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    pupil = relationship("Pupil", back_populates="interventions")

    __table_args__ = (Index("idx_interventions_pupil_status", "pupil_id", "status"),)


class InterventionLog(Base):
    __tablename__ = "intervention_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    intervention_id = Column(
        UUID(as_uuid=True),
        ForeignKey("interventions.id", ondelete="CASCADE"),
        index=True,
    )
    action_type = Column(String(50))
    details = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class Card(Base):
    __tablename__ = "cards"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pupil_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pupils.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    card_number = Column(String(50), unique=True, index=True)
    qr_code_path = Column(String(255))
    qr_token = Column(String(100), unique=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    status = Column(SQLAlchemyEnum(CardStatus), default=CardStatus.ACTIVE, index=True)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CardScanLog(Base):
    __tablename__ = "card_scan_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id = Column(
        UUID(as_uuid=True), ForeignKey("cards.id", ondelete="CASCADE"), index=True
    )
    scanner_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )
    scanner_role = Column(String(50))
    scan_type = Column(String(50))
    location_name = Column(String(255))
    location_lat = Column(Float)
    location_lon = Column(Float)
    device_info = Column(String(255))
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action = Column(SQLAlchemyEnum(AuditActionType), index=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    user_email = Column(String(100), index=True)
    resource_type = Column(String(50), index=True)
    resource_id = Column(String(100), index=True)
    ip_address = Column(String(45))
    user_agent = Column(String(512))
    extra_data = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (Index("idx_audit_logs_action_time", "action", "timestamp"),)
