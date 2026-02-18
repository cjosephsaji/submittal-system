from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user_tenant import User, UserRole
from app.models.system_setting import SystemSetting
from pydantic import BaseModel

router = APIRouter()

class SettingUpdate(BaseModel):
    key: str
    value: str

@router.get("/settings")
def read_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPER_ADMIN, UserRole.CONSULTANT_ADMIN])),
) -> Any:
    """
    Get all system settings.
    """
    settings = db.query(SystemSetting).all()
    # Convert list to dict for easier frontend consumption
    return {s.key: s.value for s in settings}

@router.put("/settings")
def update_setting(
    setting_in: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.RoleChecker([UserRole.SUPER_ADMIN, UserRole.CONSULTANT_ADMIN])),
) -> Any:
    """
    Update a specific system setting.
    """
    setting = db.query(SystemSetting).filter(SystemSetting.key == setting_in.key).first()
    if not setting:
        # Create if not exists
        setting = SystemSetting(key=setting_in.key, value=setting_in.value)
        db.add(setting)
    else:
        setting.value = setting_in.value
        
    db.commit()
    return {"status": "success", "key": setting.key, "value": setting.value}
