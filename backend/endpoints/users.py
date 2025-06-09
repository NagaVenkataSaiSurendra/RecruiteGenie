from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from ..models.user import User
from ..schemas.user import UserCreate, UserResponse
from ..services.auth_service import auth_service
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate):
    """Create a new user"""
    try:
        logger.info(f"Creating new user with email: {user.email}")
        created_user = auth_service.create_user(
            email=user.email,
            password=user.password,
            full_name=user.full_name
        )
        if not created_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        return created_user.to_dict()
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(auth_service.get_current_user)):
    """Get current user information"""
    try:
        logger.info(f"Retrieving user information for user ID: {current_user.id}")
        return current_user.to_dict()
    except Exception as e:
        logger.error(f"Error retrieving user information: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{user_id}", response_model=UserResponse)
async def read_user(user_id: int, current_user = Depends(auth_service.get_current_user)):
    """Get user by ID"""
    try:
        logger.info(f"Retrieving user with ID: {user_id}")
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user: UserCreate, current_user = Depends(auth_service.get_current_user)):
    """Update user information"""
    try:
        logger.info(f"Updating user with ID: {user_id}")
        existing_user = User.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user fields
        existing_user.email = user.email
        existing_user.full_name = user.full_name
        if user.password:
            existing_user.hashed_password = auth_service.get_password_hash(user.password)
        
        existing_user.update(user_id)
        return existing_user.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{user_id}")
async def delete_user(user_id: int, current_user = Depends(auth_service.get_current_user)):
    """Delete a user"""
    try:
        logger.info(f"Deleting user with ID: {user_id}")
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        User.delete(user_id)
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 