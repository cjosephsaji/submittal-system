from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user_tenant import User, UserRole
from app.schemas.user import Token, UserLogin, UserCreate

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    try:
        user = db.query(User).filter(User.email == form_data.username).first()
        if not user or not security.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        elif not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": security.create_access_token(
                user.id, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
        }
    except Exception as e:
        print(f"CRITICAL LOGIN ERROR: {str(e)}")
        # If it's already an HTTPException, re-raise it
        if isinstance(e, HTTPException):
            raise e
        # Otherwise, raise a 500 with the error message for debugging
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error during login: {str(e)}"
        )
