import asyncio
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models.job_description import JobDescription
from ..models.consultant_profile import ConsultantProfile
from ..models.matching_result import MatchingResult
from ..services.agent_service import agent_service
from ..services.email_service import email_service
from ..schemas.matching_result import AgentStatusResponse
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MatchingService:
    def __init__(self):
        self._status_cache = {}

    async def start_matching_process(self, db: Session, job_id: int) -> Dict[str, Any]:
        """
        Start the complete matching process using multi-agent system
        """
        try:
            # Get job description
            job_description = db.query(JobDescription).filter(JobDescription.id == job_id).first()
            if not job_description:
                raise ValueError("Job description not found")

            # Update job status
            job_description.status = "matching"
            db.commit()

            # Get all available consultant profiles
            consultant_profiles = db.query(ConsultantProfile).filter(
                ConsultantProfile.availability == "available"
            ).all()

            if not consultant_profiles:
                raise ValueError("No available consultant profiles found")

            # Step 1: Comparison Agent
            similarity_results = await agent_service.comparison_agent(
                db, job_description, consultant_profiles
            )

            # Step 2: Ranking Agent
            ranked_consultants, overall_score = await agent_service.ranking_agent(
                db, job_id, similarity_results
            )

            # Step 3: Communication Agent
            top_matches = ranked_consultants[:3]  # Top 3 matches
            email_sent = await agent_service.communication_agent(
                db, job_id, job_description.title, top_matches, overall_score, email_service
            )

            # Save matching results
            matching_result = MatchingResult(
                job_id=job_id,
                job_title=job_description.title,
                department=job_description.department,
                similarity_score=overall_score,
                top_matches=top_matches,
                email_sent=email_sent,
                email_recipients=["ar_requestor@company.com"] if email_sent else []
            )
            db.add(matching_result)

            # Update job status
            job_description.status = "completed"
            db.commit()

            return {
                "success": True,
                "job_id": job_id,
                "overall_score": overall_score,
                "top_matches_count": len(top_matches),
                "email_sent": email_sent
            }

        except Exception as e:
            # Update job status to error
            job_description = db.query(JobDescription).filter(JobDescription.id == job_id).first()
            if job_description:
                job_description.status = "error"
                db.commit()
            
            raise e

    def get_matching_results(self, db: Session) -> List[MatchingResult]:
        """Get all matching results"""
        return db.query(MatchingResult).order_by(MatchingResult.created_at.desc()).all()

    def get_agent_status(self, db: Session, job_id: int) -> Dict[str, Any]:
        """Get current agent status for a job"""
        from ..models.agent_status import AgentStatus
        
        agent_status = db.query(AgentStatus).filter(AgentStatus.job_id == job_id).first()
        
        if not agent_status:
            return {
                "comparison": {"status": "idle", "progress": 0},
                "ranking": {"status": "idle", "progress": 0},
                "communication": {"status": "idle", "progress": 0}
            }

        return {
            "comparison": {
                "status": agent_status.comparison_status,
                "progress": agent_status.comparison_progress
            },
            "ranking": {
                "status": agent_status.ranking_status,
                "progress": agent_status.ranking_progress
            },
            "communication": {
                "status": agent_status.communication_status,
                "progress": agent_status.communication_progress
            }
        }

    def start_comparison(self, job_id: int) -> None:
        """Start the comparison process for a job"""
        try:
            logger.info(f"Starting comparison for job ID: {job_id}")
            job = JobDescription.get_by_id(job_id)
            if not job:
                raise ValueError(f"Job with ID {job_id} not found")

            # Update status
            self._status_cache[job_id] = {
                "status": "in_progress",
                "progress": 0.0,
                "message": "Starting comparison",
                "last_updated": datetime.utcnow()
            }

            # Get all consultant profiles
            consultants = ConsultantProfile.get_all()
            
            # Simulate comparison process
            total_consultants = len(consultants)
            for i, consultant in enumerate(consultants):
                # Update progress
                progress = (i + 1) / total_consultants * 100
                self._status_cache[job_id] = {
                    "status": "in_progress",
                    "progress": progress,
                    "message": f"Comparing with consultant {i + 1} of {total_consultants}",
                    "last_updated": datetime.utcnow()
                }

                # Create matching result
                score = self._calculate_similarity(job, consultant)
                MatchingResult.create(
                    job_id=job_id,
                    consultant_id=consultant.id,
                    score=score,
                    status="completed"
                )

            # Update final status
            self._status_cache[job_id] = {
                "status": "completed",
                "progress": 100.0,
                "message": "Comparison completed",
                "last_updated": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Error in comparison process: {str(e)}")
            self._status_cache[job_id] = {
                "status": "error",
                "progress": 0.0,
                "message": str(e),
                "last_updated": datetime.utcnow()
            }
            raise

    def get_status(self, job_id: int) -> Optional[AgentStatusResponse]:
        """Get the current status of the matching process"""
        try:
            status_data = self._status_cache.get(job_id)
            if not status_data:
                return None

            return AgentStatusResponse(
                job_id=job_id,
                status=status_data["status"],
                progress=status_data["progress"],
                message=status_data["message"],
                last_updated=status_data["last_updated"]
            )
        except Exception as e:
            logger.error(f"Error getting status: {str(e)}")
            return None

    def get_results(self, job_id: int) -> List[dict]:
        """Get matching results for a job"""
        try:
            results = MatchingResult.get_by_job_id(job_id)
            return [result.to_dict() for result in results]
        except Exception as e:
            logger.error(f"Error getting results: {str(e)}")
            return []

    def _calculate_similarity(self, job: JobDescription, consultant: ConsultantProfile) -> float:
        """Calculate similarity score between job and consultant"""
        # This is a placeholder for the actual similarity calculation
        # In a real implementation, this would use NLP or other techniques
        return 0.75  # Placeholder score

matching_service = MatchingService()