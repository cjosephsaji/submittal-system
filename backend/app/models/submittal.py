from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as PgEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class SubmittalStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED_TO_CONTRACTOR = "SUBMITTED_TO_CONTRACTOR"
    FORWARDED_TO_ENGINEER = "FORWARDED_TO_ENGINEER"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    APPROVED_WITH_COMMENTS = "APPROVED_WITH_COMMENTS"
    REVISE_AND_RESUBMIT = "REVISE_AND_RESUBMIT"
    REJECTED = "REJECTED"

class Submittal(Base):
    __tablename__ = "submittals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    submittal_number = Column(String, index=True) # Auto-generated e.g. "MAT-001"
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="submittals")
    
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    status = Column(PgEnum(SubmittalStatus), default=SubmittalStatus.DRAFT)
    
    # Structured Data (FR-3.3)
    category = Column(String, index=True) # e.g. "Battery", "Concrete"
    ai_processing_status = Column(String, default="IDLE") # IDLE, PROCESSING, COMPLETED, FAILED
    material_data = Column(JSON) # Stores: description, manufacturer, standards, verification_checklist, etc.
    
    # Relationships
    documents = relationship("Document", back_populates="submittal")
    review_cycle = relationship("ReviewCycle", back_populates="submittal")

class DocumentType(str, enum.Enum):
    DATASHEET = "datasheet"
    CERTIFICATE = "certificate"
    TEST_REPORT = "test_report"
    WARRANTY = "warranty"
    DRAWING = "drawing"
    OTHER = "other"
    
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False) # S3 or local path
    file_size = Column(Integer)
    mime_type = Column(String)
    
    submittal_id = Column(Integer, ForeignKey("submittals.id"), nullable=False)
    submittal = relationship("Submittal", back_populates="documents")
    
    requirement_id = Column(Integer, ForeignKey("project_requirements.id"), nullable=True)
    requirement = relationship("ProjectRequirement")
    
    document_type = Column(PgEnum(DocumentType), default=DocumentType.OTHER)
    
    # AI Analysis Results (FR-3.5)
    ai_status = Column(String) # "compliant", "missing_info", "non_compliant"
    ai_confidence = Column(Integer) # 0-100
    ai_extraction_data = Column(JSON) # Extracted text/fields
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SubmittalIndex(Base):
    """Configurable required documents per project (FR-3.4)"""
    __tablename__ = "submittal_indexes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # e.g. "Civil Works Material"
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="submittal_indexes")
    
    required_document_types = Column(JSON) # List of types required
