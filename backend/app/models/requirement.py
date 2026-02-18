from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class ProjectRequirement(Base):
    __tablename__ = "project_requirements"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    raw_requirement = Column(String, nullable=False)
    field_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=True) # e.g. "Battery", "Concrete"
    category_id = Column(Integer, ForeignKey("project_categories.id"), nullable=True)
    field_type = Column(String, nullable=False, default="file")

    project = relationship("Project")
    category_rel = relationship("ProjectCategory", back_populates="requirements")
