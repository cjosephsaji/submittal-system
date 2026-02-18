from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class ProjectCategory(Base):
    __tablename__ = "project_categories"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    assigned_vendor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    project = relationship("Project", back_populates="categories")
    assigned_vendor = relationship("User")
    requirements = relationship("ProjectRequirement", back_populates="category_rel")
