from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.requirement import ProjectRequirement
from app.models.user_tenant import User, UserRole
from app.services.ai_service import ai_service
from pydantic import BaseModel

router = APIRouter()

class RequirementSentence(BaseModel):
    sentence: str

class RequirementSuggestion(BaseModel):
    field_name: str
    description: str

class RequirementConfirm(BaseModel):
    raw_requirement: str
    field_name: str
    description: str
    category: str | None = None
    category_id: int | None = None
    field_type: str = "file"

class RequirementOut(BaseModel):
    id: int
    project_id: int
    raw_requirement: str
    field_name: str
    description: str | None
    category: str | None
    category_id: int | None
    field_type: str
    
    class Config:
        from_attributes = True

@router.post("/{project_id}/suggest", response_model=RequirementSuggestion)
async def suggest_requirement(
    project_id: int,
    data: RequirementSentence,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.CONTRACTOR, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Get AI-suggested field name and description for a natural language requirement.
    """
    refined = await ai_service.refine_requirement(data.sentence)
    return refined

@router.post("/{project_id}", response_model=RequirementOut)
async def create_requirement(
    project_id: int,
    data: RequirementConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.CONTRACTOR, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Create a project requirement with confirmed AI-generated data.
    """
    obj = ProjectRequirement(
        project_id=project_id,
        raw_requirement=data.raw_requirement,
        field_name=data.field_name,
        description=data.description,
        category=data.category,
        category_id=data.category_id,
        field_type=data.field_type
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("/{project_id}", response_model=List[RequirementOut])
def read_requirements(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get all requirements for a project.
    """
    return db.query(ProjectRequirement).filter(ProjectRequirement.project_id == project_id).all()

@router.delete("/{requirement_id}")
async def delete_requirement(
    requirement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.CONTRACTOR, UserRole.SUPER_ADMIN]))
) -> Any:
    """
    Delete a project requirement.
    """
    obj = db.query(ProjectRequirement).filter(ProjectRequirement.id == requirement_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # Unlink documents first to avoid FK constraint error
    from app.models.submittal import Document
    db.query(Document).filter(Document.requirement_id == requirement_id).update({"requirement_id": None})
    
    db.delete(obj)
    db.commit()
    return {"status": "success", "message": "Requirement deleted"}
