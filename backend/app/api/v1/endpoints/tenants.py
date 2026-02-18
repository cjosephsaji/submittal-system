from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user_tenant import User, UserRole, Tenant
from pydantic import BaseModel

router = APIRouter()

class TenantOut(BaseModel):
    id: int
    name: str
    domain: str | None
    is_active: bool | None
    
    class Config:
        from_attributes = True

class TenantCreate(BaseModel):
    name: str
    domain: str | None = None

@router.get("", response_model=List[TenantOut])
def read_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPER_ADMIN])),
) -> Any:
    """
    Get all tenants. Only super_admin can view all tenants.
    """
    return db.query(Tenant).all()

@router.post("", response_model=TenantOut)
def create_tenant(
    *,
    db: Session = Depends(get_db),
    tenant_in: TenantCreate,
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPER_ADMIN])),
) -> Any:
    """
    Create new tenant. Only super_admin can create tenants.
    """
    tenant = Tenant(
        name=tenant_in.name,
        domain=tenant_in.domain,
        is_active=True
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant
