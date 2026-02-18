from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as PgEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CONSULTANT_ADMIN = "consultant_admin"
    CONSULTANT_ENGINEER = "consultant_engineer"
    CONTRACTOR = "contractor"
    SUPPLIER = "supplier"

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    domain = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    users = relationship("User", back_populates="tenant")
    projects = relationship("Project", back_populates="tenant")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(PgEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True) # Nullable for Super Admin
    tenant = relationship("Tenant", back_populates="users")

    # Relationships
    assigned_projects = relationship("ProjectAssignment", back_populates="user")
