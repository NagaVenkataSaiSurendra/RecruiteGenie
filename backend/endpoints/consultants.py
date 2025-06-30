from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.consultant_profile import ConsultantProfile
from ..models.user import User
from ..schemas.consultant_profile import ConsultantProfileCreate, ConsultantProfileResponse, ConsultantProfileUpdate
from ..services.auth_service import auth_service
from backend.logging import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/consultants", tags=["Consultants"])

def consultant_dict_to_response(consultant):
    return {
        'consultant_id': consultant['id'],
        'name': consultant['name'],
        'email': consultant['email'],
        'skills': consultant['skills'].split(',') if isinstance(consultant['skills'], str) else consultant['skills'],
        'experience': consultant['experience'],
        'bio': consultant.get('profile_summary', consultant.get('bio', '')),
        'availability': consultant.get('availability', 'available'),
        'rating': consultant.get('rating', None),
        'created_at': consultant['created_at'],
    }

@router.post("/", response_model=ConsultantProfileResponse, status_code=201)
async def create_consultant(profile: ConsultantProfileCreate, current_user: dict = Depends(auth_service.get_current_user)):
    """Create a new consultant profile"""
    try:
        logger.info(f"Creating new consultant profile for user ID: {current_user['id']}")
        profile_id = ConsultantProfile.create(
            name=profile.name,
            email=profile.email,
            experience=profile.experience,
            skills=','.join(profile.skills),
            profile_summary=profile.bio or ''
        )
        new_profile = ConsultantProfile.get_by_id(profile_id)
        return consultant_dict_to_response(new_profile)
    except Exception as e:
        logger.error(f"Error creating consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[ConsultantProfileResponse])
async def get_all_consultants(current_user: dict = Depends(auth_service.get_current_user)):
    """Get all consultant profiles"""
    try:
        logger.info("Retrieving all consultant profiles")
        consultants = ConsultantProfile.get_all()
        return [consultant_dict_to_response(consultant) for consultant in consultants]
    except Exception as e:
        logger.error(f"Error retrieving consultant profiles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{consultant_id}", response_model=ConsultantProfileResponse)
async def get_consultant_profile(
    consultant_id: int,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Get a specific consultant profile"""
    try:
        logger.info(f"Retrieving consultant profile with ID: {consultant_id}")
        consultant = ConsultantProfile.get_by_id(consultant_id)
        if consultant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultant profile not found"
            )
        return consultant_dict_to_response(consultant)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{consultant_id}", response_model=ConsultantProfileResponse)
async def update_consultant_profile(
    consultant_id: int,
    consultant_update: ConsultantProfileUpdate,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Update a consultant profile"""
    try:
        logger.info(f"Updating consultant profile with ID: {consultant_id}")
        consultant = ConsultantProfile.get_by_id(consultant_id)
        if consultant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultant profile not found"
            )
        # Update fields
        for field, value in consultant_update.dict(exclude_unset=True).items():
            setattr(consultant, field, value)
        consultant.update(consultant_id)
        return consultant_dict_to_response(consultant)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{consultant_id}")
async def delete_consultant_profile(
    consultant_id: int,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Delete a consultant profile"""
    try:
        logger.info(f"Deleting consultant profile with ID: {consultant_id}")
        consultant = ConsultantProfile.get_by_id(consultant_id)
        if consultant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultant profile not found"
            )
        
        ConsultantProfile.delete(consultant_id)
        return {"message": "Consultant profile deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )