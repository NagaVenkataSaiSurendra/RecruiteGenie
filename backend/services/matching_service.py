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
from backend.logging import logging
import json

# Set up logging
logger = logging.getLogger(__name__)

class MatchingService:
    def __init__(self):
        self._status_cache = {}

    async def start_matching_process(self, db: Session, job_id: int) -> Dict[str, Any]:
        """
        Start the complete matching process using multi-agent system
        """
        try:
            logger.info(f"Starting matching process for job_id={job_id}")
            job_description = db.query(JobDescription).filter(JobDescription.id == job_id).first()
            if not job_description:
                logger.error(f"Job description not found for job_id={job_id}")
                raise ValueError("Job description not found")
            job_description.status = "matching"
            db.commit()
            consultant_profiles = db.query(ConsultantProfile).filter(
                ConsultantProfile.availability == "available"
            ).all()
            if not consultant_profiles:
                logger.error(f"No available consultant profiles found for job_id={job_id}")
                raise ValueError("No available consultant profiles found")
            logger.info(f"Calling comparison agent for job_id={job_id}")
            similarity_results = await agent_service.comparison_agent(
                db, job_description, consultant_profiles
            )
            logger.info(f"Comparison agent completed for job_id={job_id}")
            logger.info(f"Calling ranking agent for job_id={job_id}")
            ranked_consultants, overall_score = await agent_service.ranking_agent(
                db, job_id, similarity_results
            )
            logger.info(f"Ranking agent completed for job_id={job_id}, overall_score={overall_score}")
            top_matches = ranked_consultants[:3]
            logger.info(f"Calling communication agent for job_id={job_id}")
            email_sent = await agent_service.communication_agent(
                db, job_id, job_description.title, top_matches, overall_score, email_service
            )
            logging.info(f"Communication agent completed for job_id={job_id}, email_sent={email_sent}")
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
            job_description.status = "completed"
            db.commit()
            logging.info(f"Matching process completed for job_id={job_id}")
            return {
                "success": True,
                "job_id": job_id,
                "overall_score": overall_score,
                "top_matches_count": len(top_matches),
                "email_sent": email_sent
            }
        except Exception as e:
            logging.error(f"Error in matching process for job_id={job_id}: {e}")
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

    def db_job_to_schema(self, job):
        return {
            "job_id": job["id"],
            "title": job["title"],
            "department": job.get("department", ""),
            "description": job["description"],
            "skills": job["skills"].split(",") if isinstance(job["skills"], str) else job["skills"],
            "experience_required": job.get("experience_required", 0),
            "status": job.get("status", "active"),
            "user_id": job.get("user_id", 1),
            "created_at": job["created_at"],
            "updated_at": job["updated_at"],
        }

    def db_consultant_to_schema(self, consultant):
        return {
            "consultant_id": consultant["id"],
            "name": consultant["name"],
            "email": consultant["email"],
            "skills": consultant["skills"].split(",") if isinstance(consultant["skills"], str) else consultant["skills"],
            "experience": consultant["experience"],
            "bio": consultant.get("profile_summary", consultant.get("bio", "")),
            "availability": consultant.get("availability", "available"),
            "rating": consultant.get("rating", None),
            "created_at": consultant["created_at"],
        }

    def start_comparison(self, job_id: int) -> None:
        """Start the comparison process for a job"""
        try:
            logger.info(f"Starting comparison for job ID: {job_id}")
            job = JobDescription.get_by_id(job_id)
            if not job:
                raise ValueError(f"Job with ID {job_id} not found")
            job = self.db_job_to_schema(job)
            # Update status
            self._status_cache[job_id] = {
                "status": "in_progress",
                "progress": 0.0,
                "message": "Starting comparison",
                "last_updated": datetime.utcnow()
            }
            # Get all consultant profiles
            consultants = ConsultantProfile.get_all()
            consultants = [self.db_consultant_to_schema(c) for c in consultants]
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
                    job_description_id=job_id,
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
        """Get matching results for a job, mapped to MatchingResultResponse schema"""
        try:
            results = MatchingResult.get_by_job_description_id(job_id)
            if not results:
                return []
            columns = [
                'id', 'job_description_id', 'status', 'results', 'created_at', 'updated_at'
            ]
            result_dicts = []
            # Fetch job details once
            job = JobDescription.get_by_id(job_id)
            job_title = job['title'] if job else ''
            department = job.get('department', '') if job else ''
            for row in results:
                row_dict = dict(zip(columns, row))
                # Parse the 'results' JSON if present
                results_json = None
                if row_dict.get('results'):
                    try:
                        results_json = json.loads(row_dict['results'])
                    except Exception:
                        results_json = None
                # Map to schema fields
                result_dicts.append({
                    'id': row_dict['id'],
                    'job_id': row_dict['job_description_id'],
                    'job_title': job_title,
                    'department': department,
                    'similarity_score': float(results_json.get('similarity_score', 0.0)) if results_json else 0.0,
                    'top_matches': (results_json.get('top_matches') if results_json else []),
                    'email_sent': (results_json.get('email_sent') if results_json else False),
                    'email_recipients': (results_json.get('email_recipients') if results_json else []),
                    'created_at': row_dict['created_at'],
                    'updated_at': row_dict['updated_at'],
                })
            return result_dicts
        except Exception as e:
            logger.error(f"Error getting results: {str(e)}")
            return []

    def _calculate_similarity(self, job: dict, consultant: dict) -> float:
        """Calculate similarity score between job and consultant"""
        # This is a placeholder for the actual similarity calculation
        # In a real implementation, this would use NLP or other techniques
        return 0.75  # Placeholder score

matching_service = MatchingService()