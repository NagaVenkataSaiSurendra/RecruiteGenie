from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.job_description import JobDescription
from ..models.user import User
from ..schemas.job_description import JobDescriptionCreate, JobDescriptionResponse, JobDescriptionUpdate
from ..services.auth_service import auth_service
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.post("/", response_model=JobDescriptionResponse, status_code=201)
async def create_job(job: JobDescriptionCreate, current_user: dict = Depends(auth_service.get_current_user)):
    """Create a new job description"""
    try:
        logger.info(f"Creating new job description for user ID: {current_user['id']}")
        job_id = JobDescription.create(
            title=job.title,
            department=job.department,
            description=job.description,
            skills=job.skills,
            experience_required=job.experience_required,
            created_by=current_user['id']
        )
        created_job = JobDescription.get_by_id(job_id)
        return created_job.to_dict()
    except Exception as e:
        logger.error(f"Error creating job description: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[JobDescriptionResponse])
async def get_all_jobs(current_user: dict = Depends(auth_service.get_current_user)):
    """Get all job descriptions"""
    try:
        logger.info("Retrieving all job descriptions")
        jobs = JobDescription.get_all()
        return [dict(job) for job in jobs]
    except Exception as e:
        logger.error(f"Error retrieving job descriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{job_id}", response_model=JobDescriptionResponse)
async def get_job_description(
    job_id: int,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Get a specific job description"""
    try:
        logger.info(f"Retrieving job description with ID: {job_id}")
        job = JobDescription.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found"
            )
        return job.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving job description: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{job_id}", response_model=JobDescriptionResponse)
async def update_job_description(
    job_id: int,
    job_update: JobDescriptionUpdate,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Update a job description"""
    try:
        logger.info(f"Updating job description with ID: {job_id}")
        job = JobDescription.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found"
            )
        
        # Update fields
        for field, value in job_update.dict(exclude_unset=True).items():
            setattr(job, field, value)
        
        job.update(job_id)
        return job.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating job description: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{job_id}")
async def delete_job_description(
    job_id: int,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Delete a job description"""
    try:
        logger.info(f"Deleting job description with ID: {job_id}")
        job = JobDescription.get_by_id(job_id)
        if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found"
            )
        
        JobDescription.delete(job_id)
        return {"message": "Job description deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job description: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )