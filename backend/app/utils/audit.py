from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from typing import Any, Dict, Optional


class AuditEventType:
    """Standardized event type constants for audit logging"""
    
    # Submittal Lifecycle
    SUBMITTAL_CREATED = "SUBMITTAL_CREATED"
    SUBMITTAL_UPDATED = "SUBMITTAL_UPDATED"
    SUBMITTAL_DELETED = "SUBMITTAL_DELETED"
    
    # Document Operations
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    
    # AI Processing Events
    AI_PROCESSING_STARTED = "AI_PROCESSING_STARTED"
    AI_PROCESSING_COMPLETED = "AI_PROCESSING_COMPLETED"
    AI_PROCESSING_FAILED = "AI_PROCESSING_FAILED"
    AI_DATA_EXTRACTED = "AI_DATA_EXTRACTED"
    AI_REQUIREMENTS_VERIFIED = "AI_REQUIREMENTS_VERIFIED"
    
    # Status Change Events
    STATUS_SUBMITTED_TO_CONTRACTOR = "STATUS_SUBMITTED_TO_CONTRACTOR"
    STATUS_FORWARDED_TO_ENGINEER = "STATUS_FORWARDED_TO_ENGINEER"
    STATUS_APPROVED = "STATUS_APPROVED"
    STATUS_REJECTED = "STATUS_REJECTED"
    STATUS_REVISE_RESUBMIT = "STATUS_REVISE_RESUBMIT"
    
    # Review Actions
    REVIEW_SUBMITTED = "REVIEW_SUBMITTED"
    COMMENTS_ADDED = "COMMENTS_ADDED"
    
    # Legacy actions (for backward compatibility)
    BUNDLE_UPLOAD = "BUNDLE_UPLOAD"
    RESUBMIT = "RESUBMIT"
    REVIEW = "REVIEW"


def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """
    Utility function to log an audit event.
    
    Args:
        db: Database session
        user_id: ID of user performing action (None for system actions)
        action: Event type (use AuditEventType constants)
        resource_type: Type of resource (e.g., "submittal", "document")
        resource_id: ID of the resource
        details: Additional context (file names, status changes, etc.)
        ip_address: IP address of the user
    """
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address
    )
    db.add(audit_log)
    db.commit()
    return audit_log


def log_submittal_event(
    db: Session,
    submittal_id: int,
    event_type: str,
    user_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None
):
    """
    Helper function specifically for logging submittal events.
    
    Args:
        db: Database session
        submittal_id: ID of the submittal
        event_type: Type of event (use AuditEventType constants)
        user_id: ID of user performing action (None for system/AI actions)
        details: Additional event context
    """
    return log_audit(
        db=db,
        user_id=user_id,
        action=event_type,
        resource_type="submittal",
        resource_id=submittal_id,
        details=details
    )
