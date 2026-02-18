from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False) # e.g., "UPLOAD", "REVIEW", "ACTION"
    resource_type = Column(String, nullable=False) # e.g., "submittal"
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True) # e.g., {"old_status": "draft", "new_status": "submitted"}
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
