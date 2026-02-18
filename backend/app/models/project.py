from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as PgEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class ProjectStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    COMPLETED = "COMPLETED"

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, index=True) # e.g. "PRJ-001"
    description = Column(Text)
    
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    tenant = relationship("Tenant", back_populates="projects")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(PgEnum(ProjectStatus), default=ProjectStatus.ACTIVE)

    assignments = relationship("ProjectAssignment", back_populates="project")
    submittals = relationship("Submittal", back_populates="project")
    submittal_indexes = relationship("SubmittalIndex", back_populates="project")
    requirements = relationship("ProjectRequirement", back_populates="project")
    categories = relationship("ProjectCategory", back_populates="project")

class ProjectAssignment(Base):
    """Link users (Engineers/Contractors) to Projects"""
    __tablename__ = "project_assignments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_in_project = Column(String) # Optional override or specific contextual role
    
    project = relationship("Project", back_populates="assignments")
    user = relationship("User", back_populates="assigned_projects")
