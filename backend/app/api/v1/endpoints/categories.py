from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.category import ProjectCategory
from app.models.user_tenant import User, UserRole
from pydantic import BaseModel

router = APIRouter()

class CategoryCreate(BaseModel):
    name: str
    assigned_vendor_id: int | None = None

class CategoryAssign(BaseModel):
    vendor_id: int | None

class UserSimpleOut(BaseModel):
    id: int
    email: str
    full_name: str | None
    
    class Config:
        from_attributes = True

class CategoryOut(BaseModel):
    id: int
    project_id: int
    name: str
    assigned_vendor_id: int | None
    assigned_vendor: UserSimpleOut | None = None
    
    class Config:
        from_attributes = True

@router.post("/{project_id}", response_model=CategoryOut)
async def create_category(
    project_id: int,
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Create a new trade/category for a project.
    """
    # Check if exists
    exists = db.query(ProjectCategory).filter(
        ProjectCategory.project_id == project_id,
        ProjectCategory.name == data.name
    ).first()
    
    if exists:
        return exists
    
    obj = ProjectCategory(
        project_id=project_id,
        name=data.name,
        assigned_vendor_id=data.assigned_vendor_id
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/{project_id}", response_model=List[CategoryOut])
def read_categories(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    List all categories for a project.
    """
    return db.query(ProjectCategory).filter(ProjectCategory.project_id == project_id).all()

@router.put("/{category_id}/assign", response_model=CategoryOut)
async def assign_vendor_to_category(
    category_id: int,
    data: CategoryAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Assign a vendor to a specific category.
    """
    cat = db.query(ProjectCategory).filter(ProjectCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    cat.assigned_vendor_id = data.vendor_id
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Delete a category.
    """
    cat = db.query(ProjectCategory).filter(ProjectCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Handle requirements linked to this category
    from app.models.requirement import ProjectRequirement
    db.query(ProjectRequirement).filter(ProjectRequirement.category_id == category_id).update({
        "category_id": None,
        "category": None
    })
    
    db.delete(cat)
    db.commit()
    return {"status": "success", "message": "Category deleted"}
