from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.project import Project, ProjectStatus
from app.models.user_tenant import User, UserRole
from pydantic import BaseModel
from datetime import datetime
from app.core import security
from app.models.project import ProjectAssignment

router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    code: str | None = None
    description: str | None = None

class ProjectOut(BaseModel):
    id: int
    name: str
    code: str | None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProjectAssignUser(BaseModel):
    user_id: int | None = None
    email: str | None = None
    full_name: str | None = None
    role: UserRole

@router.post("", response_model=ProjectOut)
def create_project(
    *,
    db: Session = Depends(get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.SUPER_ADMIN])),
) -> Any:
    """
    Create a new project with auto-generated code.
    """
    # Auto-generate code if not provided: PRJ-YEAR-COUNT
    code = project_in.code
    if not code:
        count = db.query(Project).filter(Project.tenant_id == current_user.tenant_id).count()
        year = datetime.now().year
        code = f"PRJ-{year}-{count + 1:03d}"

    obj = Project(
        name=project_in.name,
        code=code,
        description=project_in.description,
        tenant_id=current_user.tenant_id,
        status=ProjectStatus.ACTIVE
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("", response_model=List[ProjectOut])
def read_projects(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve projects for the user's tenant.
    Admins see all, others see only assigned projects.
    """
    if current_user.role in [UserRole.CONSULTANT_ADMIN, UserRole.SUPER_ADMIN]:
        return db.query(Project).filter(Project.tenant_id == current_user.tenant_id).offset(skip).limit(limit).all()
    
    return db.query(Project)\
        .join(ProjectAssignment)\
        .filter(ProjectAssignment.user_id == current_user.id)\
        .offset(skip).limit(limit).all()

@router.post("/{project_id}/assign", response_model=Any)
def assign_user_to_project(
    project_id: int,
    assignment: ProjectAssignUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Assign a user to a project. If user doesn't exist, create them.
    Hierarchy:
    - CONSULTANT_ADMIN -> Engineer, Contractor, Supplier
    - CONSULTANT_ENGINEER -> Contractor, Supplier
    - CONTRACTOR -> Supplier
    """
    # 1. Project existence
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == current_user.tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2. RBAC Hierarchy Check
    can_assign = False
    if current_user.role == UserRole.CONSULTANT_ADMIN:
        can_assign = assignment.role in [UserRole.CONSULTANT_ENGINEER, UserRole.CONTRACTOR, UserRole.SUPPLIER]
    elif current_user.role == UserRole.CONSULTANT_ENGINEER:
        can_assign = assignment.role in [UserRole.CONTRACTOR, UserRole.SUPPLIER]
    elif current_user.role == UserRole.CONTRACTOR:
        can_assign = assignment.role == UserRole.SUPPLIER

    if not can_assign:
        raise HTTPException(status_code=403, detail=f"User with role {current_user.role} cannot assign {assignment.role}")

    # 3. Find or Create User
    target_user = None
    if assignment.user_id:
        target_user = db.query(User).filter(User.id == assignment.user_id, User.tenant_id == current_user.tenant_id).first()
    elif assignment.email:
        target_user = db.query(User).filter(User.email == assignment.email).first()
        if not target_user:
            # Create user
            target_user = User(
                email=assignment.email,
                full_name=assignment.full_name,
                role=assignment.role,
                hashed_password=security.get_password_hash("password123"), # Default password
                tenant_id=current_user.tenant_id
            )
            db.add(target_user)
            db.flush()
    
    if not target_user:
        raise HTTPException(status_code=400, detail="User not found and no email provided for creation")

    # 4. Check if already assigned
    existing = db.query(ProjectAssignment).filter(
        ProjectAssignment.project_id == project_id,
        ProjectAssignment.user_id == target_user.id
    ).first()
    
    if existing:
        return {"status": "already_assigned", "user_id": target_user.id}

    # 5. Assign
    new_assignment = ProjectAssignment(
        project_id=project_id,
        user_id=target_user.id,
        role_in_project=assignment.role
    )
    db.add(new_assignment)
    db.commit()

    return {"status": "success", "user_id": target_user.id}

@router.get("/{project_id}/team", response_model=Any)
def read_project_team(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all users assigned to a project.
    """
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == current_user.tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    team = db.query(User).join(ProjectAssignment).filter(ProjectAssignment.project_id == project_id).all()
    
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
        } for u in team
    ]

@router.delete("/{project_id}")
def delete_project(
    *,
    db: Session = Depends(get_db),
    project_id: int,
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ADMIN, UserRole.SUPER_ADMIN])),
) -> Any:
    """
    Delete a project. Only super_admin and consultant_admin can delete projects.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.tenant_id == current_user.tenant_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {"status": "success", "message": "Project deleted"}
