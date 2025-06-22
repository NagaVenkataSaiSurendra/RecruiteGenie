from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from ..models.user import User
from ..models.matching_result import MatchingResult
from ..schemas.matching_result import MatchingRequest, MatchingResultResponse, AgentStatusResponse
from ..services.matching_service import matching_service, MatchingService
from ..services.auth_service import auth_service
from sqlalchemy.orm import Session
from ..database import get_db_connection as get_db
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matching", tags=["Matching"])

@router.post("/compare/{job_id}", response_model=AgentStatusResponse)
async def start_comparison(job_id: int, db: Session = Depends(get_db)):
    """Start the comparison process for a job"""
    try:
        logger.info(f"Starting comparison for job ID: {job_id}")
        matching_service.start_comparison(job_id)
        return matching_service.get_status(job_id)
    except Exception as e:
        logger.error(f"Error starting comparison: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}", response_model=AgentStatusResponse)
async def get_matching_status(job_id: int, db: Session = Depends(get_db)):
    """Get the current status of the matching process"""
    try:
        status = matching_service.get_status(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="No matching process found for this job")
        return status
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{job_id}", response_model=List[MatchingResultResponse])
async def get_matching_results(job_id: int, db: Session = Depends(get_db)):
    """Get matching results for a job"""
    try:
        results = matching_service.get_results(job_id)
        if not results:
            raise HTTPException(status_code=404, detail="No results found for this job")
        return results
    except Exception as e:
        logger.error(f"Error getting results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notify/{job_id}")
async def send_notification(
    job_id: int,
    current_user: User = Depends(auth_service.get_current_user)
):
    """Send notification email for matching results"""
    try:
        logger.info(f"Sending notification for job ID: {job_id}")
        result = matching_service.send_notification(job_id)
        return {
            "message": "Notification sent successfully",
            "job_id": job_id,
            "status": "sent"
        }
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/results", response_model=List[MatchingResultResponse])
async def get_all_matching_results(current_user: dict = Depends(auth_service.get_current_user)):
    results = MatchingResult.get_by_job_description_id(1) # Mocked for now
    # In a real scenario, you'd probably get all results or paginate
    return [dict(result) for result in results]

@router.get("/status/{job_id}", response_model=dict)
async def get_matching_status(job_id: int, current_user: dict = Depends(auth_service.get_current_user)):
    # Existing code for getting status...
    pass