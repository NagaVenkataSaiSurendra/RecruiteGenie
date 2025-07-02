from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Security
from backend.models.user import User
from backend.schemas.user import UserCreate, UserResponse, Token, UserLogin
from backend.services.auth_service import auth_service, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.security import bearer_scheme
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
async def register_user(user: UserCreate):
    """Register a new user"""
    try:
        logger.info(f"Attempting to register user with email: {user.email}")
        created_user = auth_service.create_user(
    email=user.email,
    password=user.password,
    full_name=user.full_name,
    role=user.role
)
        if not created_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        return dict(created_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/login")
async def login_with_json(user: UserLogin):
    """Login with JSON body (email & password) and return user details with token"""
    try:
        logger.info(f"Attempting login for user: {user.email}")
        user_obj = auth_service.authenticate_user(user.email, user.password)
        if not user_obj:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth_service.create_access_token(
            data={"sub": str(user_obj['id'])},
            expires_delta=access_token_expires
        )
        # Return token and user details
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_obj["id"],
                "fullName": user_obj.get("fullName", user_obj.get("fullname")),
                "email": user_obj["email"],
                "role": user_obj["role"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Get current user information"""
    try:
        return dict(current_user)
    except Exception as e:
        logger.error(f"Error retrieving user information: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )