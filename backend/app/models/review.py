from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as PgEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class ReviewCycle(Base):
    __tablename__ = "review_cycles"
    
    id = Column(Integer, primary_key=True, index=True)
    submittal_id = Column(Integer, ForeignKey("submittals.id"), nullable=False)
    submittal = relationship("Submittal", back_populates="review_cycle")
    
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    decision = Column(String) # Approve, Reject, etc.
    comments = relationship("ReviewComment", back_populates="review_cycle")

class ReviewComment(Base):
    __tablename__ = "review_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    review_cycle_id = Column(Integer, ForeignKey("review_cycles.id"))
    review_cycle = relationship("ReviewCycle", back_populates="comments")
    
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True) # Linked to specific doc
    page_number = Column(Integer, nullable=True)
    
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"))
