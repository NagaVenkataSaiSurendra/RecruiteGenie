from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Security, Form
from backend.models.job_description import JobDescription, JobUpload
from backend.models.user import User
from backend.schemas.job_description import JobDescriptionCreate, JobDescriptionResponse, JobDescriptionUpdate
from backend.services.auth_service import auth_service
from backend.security import bearer_scheme
import logging
import os
from .utils import extract_text_from_file
from backend.database import get_db_connection

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Jobs"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=JobDescriptionResponse, status_code=201)
async def create_job(
    job: JobDescriptionCreate,
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
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
async def get_all_jobs(
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Get all job descriptions"""
    try:
        logger.info("Retrieving all job descriptions")
        jobs = JobDescription.get_all()
        patched_jobs = []
        import json
        for job in jobs:
            job = dict(job)
            job.setdefault("department", "")
            job.setdefault("experience_required", 0)
            job.setdefault("status", "active")
            job.setdefault("created_by", job.get("user_id", None))
            # Parse skills as a list
            try:
                job["skills"] = json.loads(job.get("skills", "[]"))
                if not isinstance(job["skills"], list):
                    job["skills"] = []
            except Exception:
                job["skills"] = []
            patched_jobs.append(job)
        return patched_jobs
    except Exception as e:
        logger.error(f"Error retrieving job descriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{job_id}", response_model=JobDescriptionResponse)
async def get_job_description(
    job_id: int,
    credentials = Security(bearer_scheme),
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
    credentials = Security(bearer_scheme),
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
    credentials = Security(bearer_scheme),
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

@router.post("/upload")
async def upload_job_document_new(
    file: UploadFile = File(...),
    ar_requestor_id: int = Form(...),
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Upload a JD document, store it on disk, and insert a record in the job_descriptions table with AR Requestor info."""
    try:
        # Save file
        upload_dir = os.path.join(UPLOAD_DIR, 'jd_docs')
        os.makedirs(upload_dir, exist_ok=True)
        file_location = os.path.join(upload_dir, file.filename)
        with open(file_location, "wb") as f:
            f.write(await file.read())

        # Get AR Requestor email using User.get_by_id
        ar_requestor = User.get_by_id(ar_requestor_id)
        if not ar_requestor:
            raise HTTPException(status_code=404, detail="AR Requestor not found")
        ar_requestor_email = ar_requestor["email"]

        # Insert a record in the job_descriptions table
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO job_descriptions (ar_requestor_id, ar_requestor_email, document_path)
                    VALUES (%s, %s, %s) RETURNING id;
                    """,
                    (ar_requestor_id, ar_requestor_email, file_location)
                )
                jd_id = cursor.fetchone()[0]
                conn.commit()

        jd = JobDescription.get_by_id(jd_id)
        if not jd:
            raise HTTPException(status_code=500, detail="Failed to create job description")
        return jd
    except Exception as e:
        logger.error(f"Error uploading job document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )