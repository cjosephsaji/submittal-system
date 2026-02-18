from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.submittal import Submittal, SubmittalStatus
from app.models.user_tenant import User, UserRole
from app.utils.audit import log_audit, log_submittal_event, AuditEventType
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- Schemas ---
class SubmittalCreate(BaseModel):
    title: str
    project_id: int
    material_data: dict # JSON

class DocumentOut(BaseModel):
    id: int
    filename: str
    file_path: str
    document_type: str
    requirement_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class SubmittalOut(BaseModel):
    id: int
    title: str
    submittal_number: str | None
    status: str
    project_id: int
    category: str | None = None
    ai_processing_status: str | None = "IDLE"
    material_data: dict | None = None
    documents: List[DocumentOut] = []
    created_at: datetime
    
    class Config:
        from_attributes = True

class SubmittalReview(BaseModel):
    status: SubmittalStatus
    comments: str = ""
    requested_revisions: List[str] = []  # List of field names (not IDs)

# --- Endpoints ---

@router.post("", response_model=SubmittalOut)
def create_submittal(
    *,
    db: Session = Depends(get_db),
    submittal_in: SubmittalCreate,
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPPLIER])),
) -> Any:
    """
    Create a new material submittal.
    Role required: Contractor or Supplier.
    """
    # TODO: Check permissions (RBAC)
    
    obj = Submittal(
        title=submittal_in.title,
        project_id=submittal_in.project_id,
        material_data=submittal_in.material_data,
        created_by_id=current_user.id,
        status=SubmittalStatus.DRAFT,
        submittal_number=f"MAT-{int(datetime.now().timestamp())}" # Simple ID generation
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.get("", response_model=List[SubmittalOut])
def read_submittals(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int | None = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve submittals.
    """
    # Filter by user role
    query = db.query(Submittal)
    
    if project_id:
        query = query.filter(Submittal.project_id == project_id)
    
    # RBAC Filters
    if current_user.role == UserRole.SUPPLIER:
        query = query.filter(Submittal.created_by_id == current_user.id)
    elif current_user.role == UserRole.CONTRACTOR:
        # Contractor sees what they created OR what was submitted to them
        query = query.filter(
            (Submittal.created_by_id == current_user.id) | 
            (Submittal.status == SubmittalStatus.SUBMITTED_TO_CONTRACTOR) |
            (Submittal.status == SubmittalStatus.FORWARDED_TO_ENGINEER)
        )
    elif current_user.role == UserRole.CONSULTANT_ENGINEER:
        # Engineer sees what was forwarded to them
        query = query.filter(Submittal.status.in_([
            SubmittalStatus.FORWARDED_TO_ENGINEER,
            SubmittalStatus.UNDER_REVIEW,
            SubmittalStatus.APPROVED,
            SubmittalStatus.REJECTED,
            SubmittalStatus.REVISE_AND_RESUBMIT
        ]))
    # Consultant Admin sees all in tenant (default query)

    submittals = query.offset(skip).limit(limit).all()
    return submittals

@router.get("/{submittal_id}", response_model=SubmittalOut)
def read_submittal(
    submittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get a single submittal by ID.
    """
    submittal = db.query(Submittal).filter(Submittal.id == submittal_id).first()
    if not submittal:
        raise HTTPException(status_code=404, detail="Submittal not found")
    
    # Permission check
    if current_user.role == UserRole.SUPPLIER and submittal.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return submittal


@router.get("/{submittal_id}/audit-trail")
async def get_submittal_audit_trail(
    submittal_id: int,
    event_type: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get the complete audit trail for a submittal.
    Returns all events with user information, sorted by timestamp (newest first).
    
    Query Parameters:
    - event_type: Optional filter by event type
    - limit: Maximum number of events to return (default 100)
    """
    from app.models.audit import AuditLog
    
    # Verify submittal exists and user has access
    submittal = db.query(Submittal).filter(Submittal.id == submittal_id).first()
    if not submittal:
        raise HTTPException(status_code=404, detail="Submittal not found")
    
    # Build query
    query = db.query(AuditLog).filter(
        AuditLog.resource_type == "submittal",
        AuditLog.resource_id == submittal_id
    )
    
    # Apply event type filter if provided
    if event_type:
        query = query.filter(AuditLog.action == event_type)
    
    # Get events with limit, ordered by newest first
    audit_logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    
    # Format response with user information
    events = []
    for log in audit_logs:
        user_info = None
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            if user:
                user_info = {
                    "id": user.id,
                    "name": user.full_name,
                    "email": user.email,
                    "role": user.role.value
                }
        
        events.append({
            "id": log.id,
            "action": log.action,
            "created_at": log.created_at.isoformat(),
            "user": user_info,
            "details": log.details or {}
        })
    
    return {
        "total": len(events),
        "submittal_id": submittal_id,
        "events": events
    }

# --- File Upload ---
from fastapi import File, UploadFile, Form
import shutil
import os
from app.services.ai_service import ai_service

UPLOAD_DIR = "uploads"

from app.tasks import process_submittal_task

@router.post("/bundle", response_model=SubmittalOut)
async def upload_submittal_bundle(
    files: List[UploadFile] = File(default=[]),
    project_id: int = Form(...),
    category: str = Form(...),
    file_metadata: str = Form(None),  # JSON string mapping fileName to requirementId
    text_inputs: str = Form(None),    # JSON string mapping requirementId to textValue
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPPLIER])),
) -> Any:
    """
    Upload a group of files as a single submittal bundle.
    Also accepts text inputs for requirements.
    file_metadata format: [{"requirementId": 1, "fileName": "doc.pdf"}, ...]
    text_inputs format: [{"requirementId": 2, "value": "12345"}, ...]
    """
    from app.models.submittal import Document
    import json
    import shutil
    import os
    
    metadata_list = []
    if file_metadata:
        try:
            metadata_list = json.loads(file_metadata)
        except:
            pass
            
    # Parse text inputs
    manual_entries = []
    if text_inputs:
        try:
            manual_entries = json.loads(text_inputs)
        except:
            pass

    if not files and not manual_entries:
         raise HTTPException(status_code=400, detail="Must provide at least one file or text input")

    # 1. Create Submittal Record First
    submittal_title = f"{category} Submission - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    
    # Store manual entries in material_data
    material_data = {
        "manual_entries": manual_entries
    }
    
    obj = Submittal(
        title=submittal_title,
        project_id=project_id,
        category=category,
        created_by_id=current_user.id,
        status=SubmittalStatus.SUBMITTED_TO_CONTRACTOR,
        submittal_number=f"SUB-{int(datetime.now().timestamp())}",
        ai_processing_status="PROCESSING",
        material_data=material_data
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    
    # 2. Save All Files and Link to Submittal (and optionally to Requirements)
    UPLOAD_DIR = "uploads"
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    # Use index-based matching since the frontend appends files and metadata in the same order
    # Note: files is a list of UploadFile objects
    for i, file in enumerate(files):
        file_location = f"{UPLOAD_DIR}/{file.filename}"
        with open(file_location, "wb+") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get requirement_id from metadata by index if available
        requirement_id = None
        if i < len(metadata_list):
            requirement_id = metadata_list[i].get("requirementId")
        
        doc = Document(
            filename=file.filename,
            file_path=file_location,
            submittal_id=obj.id,
            requirement_id=requirement_id  # Link to requirement if provided
        )
        db.add(doc)
        db.flush()  # Get the document ID
        
        # Log each document upload
        log_audit(
            db=db,
            user_id=current_user.id,
            action=AuditEventType.DOCUMENT_UPLOADED,
            resource_type="submittal",
            resource_id=obj.id,
            details={
                "filename": file.filename,
                "file_size": file.size,
                "document_id": doc.id,
                "requirement_id": requirement_id
            }
        )
    
    db.commit()
    
    # 3. Trigger AI Analysis in Background via Celery
    process_submittal_task.delay(obj.id, project_id)
    
    # Audit Log - Submittal Created
    log_submittal_event(
        db=db,
        submittal_id=obj.id,
        event_type=AuditEventType.SUBMITTAL_CREATED,
        user_id=current_user.id,
        details={
            "project_id": project_id,
            "category": category,
            "file_count": len(files),
            "submittal_number": obj.submittal_number
        }
    )
    
    return obj

@router.put("/{submittal_id}/review", response_model=SubmittalOut)
async def review_submittal(
    submittal_id: int,
    review_data: SubmittalReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONSULTANT_ENGINEER, UserRole.CONSULTANT_ADMIN]))
) -> Any:
    """
    Review a submittal (Approve/Reject).
    Only Consultant Engineers and Admins can review.
    """
    submittal = db.query(Submittal).filter(Submittal.id == submittal_id).first()
    if not submittal:
        raise HTTPException(status_code=404, detail="Submittal not found")
        
    old_status = submittal.status
    submittal.status = review_data.status
    
    # Store review comments in material_data for easy access
    if not submittal.material_data:
        submittal.material_data = {}
    
    # Ensure it's a dict and append notes
    material_data = dict(submittal.material_data)
    material_data["review_comments"] = review_data.comments
    material_data["requested_revisions"] = review_data.requested_revisions
    submittal.material_data = material_data
    
    db.commit()
    db.refresh(submittal)

    # Audit Log - Use specific event type based on review action
    event_type_map = {
        "APPROVED": AuditEventType.STATUS_APPROVED,
        "REJECTED": AuditEventType.STATUS_REJECTED,
        "REVISE_AND_RESUBMIT": AuditEventType.STATUS_REVISE_RESUBMIT
    }
    
    log_submittal_event(
        db=db,
        submittal_id=submittal.id,
        event_type=event_type_map.get(review_data.status, AuditEventType.REVIEW_SUBMITTED),
        user_id=current_user.id,
        details={
            "old_status": old_status,
            "new_status": review_data.status,
            "comments": review_data.comments,
            "review_action": review_data.status,
            "requested_revisions_count": len(review_data.requested_revisions) if review_data.requested_revisions else 0
        }
    )
    return submittal

@router.patch("/{submittal_id}/submit-to-contractor", response_model=SubmittalOut)
async def submit_to_contractor(
    submittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPPLIER]))
) -> Any:
    """
    Vendor sends the submittal to the Contractor.
    """
    submittal = db.query(Submittal).filter(Submittal.id == submittal_id, Submittal.created_by_id == current_user.id).first()
    if not submittal:
        raise HTTPException(status_code=404, detail="Submittal not found")
    
    submittal.status = SubmittalStatus.SUBMITTED_TO_CONTRACTOR
    db.commit()
    db.refresh(submittal)
    
    # Audit Log
    log_submittal_event(
        db=db,
        submittal_id=submittal.id,
        event_type=AuditEventType.STATUS_SUBMITTED_TO_CONTRACTOR,
        user_id=current_user.id,
        details={
            "old_status": "DRAFT",
            "new_status": "SUBMITTED_TO_CONTRACTOR"
        }
    )
    return submittal

@router.patch("/{submittal_id}/forward-to-engineer", response_model=SubmittalOut)
async def forward_to_engineer(
    submittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.CONTRACTOR]))
) -> Any:
    """
    Contractor forwards the submittal to the Engineer.
    """
    submittal = db.query(Submittal).filter(Submittal.id == submittal_id).first()
    if not submittal:
        raise HTTPException(status_code=404, detail="Submittal not found")
    
    # Logic: Can only forward if it was submitted to them or created by them
    if submittal.status != SubmittalStatus.SUBMITTED_TO_CONTRACTOR and submittal.created_by_id != current_user.id:
        raise HTTPException(status_code=400, detail="Submittal not in a state to be forwarded")

    submittal.status = SubmittalStatus.FORWARDED_TO_ENGINEER
    db.commit()
    db.refresh(submittal)
    
    # Audit Log  
    log_submittal_event(
        db=db,
        submittal_id=submittal.id,
        event_type=AuditEventType.STATUS_FORWARDED_TO_ENGINEER,
        user_id=current_user.id,
        details={
            "old_status": "SUBMITTED_TO_CONTRACTOR",
            "new_status": "FORWARDED_TO_ENGINEER"
        }
    )
    return submittal

@router.post("/{submittal_id}/resubmit", response_model=SubmittalOut)
async def resubmit_submittal(
    submittal_id: int,
    files: List[UploadFile] = File(...),
    requirement_ids: str = Form(...), # JSON list e.g. "[1, 2]"
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPPLIER])),
) -> Any:
    """
    Resubmit specific documents for a submittal after a 'Revise and Resubmit' request.
    Only replacements for requested requirements are allowed.
    """
    import json
    from app.models.submittal import Document
    
    submittal = db.query(Submittal).filter(Submittal.id == submittal_id, Submittal.created_by_id == current_user.id).first()
    if not submittal:
        raise HTTPException(status_code=404, detail="Submittal not found")
    
    try:
        req_id_list = json.loads(requirement_ids)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid requirement_ids format. Expected JSON list.")

    if len(files) != len(req_id_list):
        raise HTTPException(status_code=400, detail="Number of files must match number of requirement_ids.")

    # 1. Update status and clear old AI metadata to trigger fresh analysis
    submittal.status = SubmittalStatus.SUBMITTED_TO_CONTRACTOR
    submittal.ai_processing_status = "PROCESSING"
    
    # 2. Process replacements
    for file, req_id in zip(files, req_id_list):
        # Delete old document for this specific requirement if it exists
        db.query(Document).filter(
            Document.submittal_id == submittal_id,
            Document.requirement_id == req_id
        ).delete()
        
        # Save new document
        file_location = f"{UPLOAD_DIR}/{file.filename}"
        with open(file_location, "wb+") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        doc = Document(
            filename=file.filename,
            file_path=file_location,
            submittal_id=submittal.id,
            requirement_id=req_id
        )
        db.add(doc)
    
    db.commit()
    db.refresh(submittal)
    
    # 3. Trigger Background Analysis via Celery
    process_submittal_task.delay(submittal.id, submittal.project_id)
    
    # Audit Log
    log_audit(
        db, 
        user_id=current_user.id, 
        action="RESUBMIT", 
        resource_type="submittal", 
        resource_id=submittal.id,
        details={"replacement_count": len(files), "requirement_ids": req_id_list}
    )
    
    return submittal

@router.delete("/{submittal_id}")
def delete_submittal(
    submittal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete a submittal.
    Role required: Admin or the Supplier who created it.
    """
    submittal = db.query(Submittal).filter(Submittal.id == submittal_id).first()
    if not submittal:
        raise HTTPException(status_code=404, detail="Submittal not found")
    
    # Permission Check
    # Super Admins and Consultant Admins can delete anything
    # Suppliers can only delete their own submittals
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.CONSULTANT_ADMIN]:
        if submittal.created_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions to delete this submittal")

    # Delete associated documents from DB
    from app.models.submittal import Document
    db.query(Document).filter(Document.submittal_id == submittal_id).delete()
    
    # Delete the submittal
    db.delete(submittal)
    db.commit()
    
    # Log the deletion
    log_audit(
        db=db,
        user_id=current_user.id,
        action="DELETE_SUBMITTAL",
        resource_type="submittal",
        resource_id=submittal_id,
        details={"title": submittal.title}
    )
    
    return {"status": "success", "message": "Submittal deleted successfully"}
