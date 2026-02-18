from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user_tenant import User, UserRole
from pydantic import BaseModel

router = APIRouter()

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    tenant_id: int | None
    
    class Config:
        from_attributes = True

@router.get("/me", response_model=UserOut)
def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.get("", response_model=List[UserOut])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    role: str | None = None,
    current_user: User = Depends(deps.RoleChecker([
        UserRole.CONSULTANT_ADMIN,
        UserRole.CONSULTANT_ENGINEER,
        UserRole.CONTRACTOR,
        UserRole.SUPER_ADMIN
    ])),
) -> Any:
    """
    Retrieve users for searchable selection.
    """
    query = db.query(User)
    
    # Simple tenant-based or multi-tenant logic would go here
    # For now, list all users within scope
    
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )
        
    if role:
        query = query.filter(User.role == role)
        
    return query.offset(skip).limit(limit).all()

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole
    tenant_id: int

class UserUpdate(BaseModel):
    email: str | None = None
    password: str | None = None
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None

@router.post("", response_model=UserOut)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPER_ADMIN, UserRole.CONSULTANT_ADMIN])),
) -> Any:
    """
    Create new user. Only super_admin and consultant_admin can create users.
    """
    from app.core.security import get_password_hash
    
    # Check if user exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        tenant_id=user_in.tenant_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPER_ADMIN, UserRole.CONSULTANT_ADMIN])),
) -> Any:
    """
    Update user. Only super_admin and consultant_admin can update users.
    """
    from app.core.security import get_password_hash
    from fastapi import HTTPException
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.password is not None:
        user.hashed_password = get_password_hash(user_in.password)
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPER_ADMIN])),
) -> Any:
    """
    Delete user. Only super_admin can delete users.
    """
    from fastapi import HTTPException
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    return {"status": "success", "message": "User deleted"}
