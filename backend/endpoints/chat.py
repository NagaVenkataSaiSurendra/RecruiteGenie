from fastapi import APIRouter, Request
from pydantic import BaseModel
from backend.services.google_chat_service import get_recruitment_chat_response
from backend.models.consultant_profile import ConsultantProfile
from backend.models.job_description import JobDescription
from backend.models.profile_match import ProfileMatch

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: list = []

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    user_message = request.message.lower()
    db_context = None
    history = request.history

    # Data-aware logic for demo
    if "top match" in user_message or "consultant match" in user_message:
        # Fetch top 3 consultant matches for the latest job
        jobs = JobDescription.get_all()
        if jobs:
            latest_job = jobs[0]
            matches = ProfileMatch.get_by_job_description_id(latest_job['id'])[:3]
            consultants = [ConsultantProfile.get_by_id(m['profile_id']) for m in matches]
            db_context = {
                "latest_job": {
                    "title": latest_job.get("job_title"),
                    "skills": latest_job.get("skills"),
                },
                "top_matches": [
                    {"name": c.get("name"), "skills": c.get("skills"), "experience": c.get("experience")} for c in consultants if c
                ]
            }
    elif "job status" in user_message or "recent job" in user_message:
        jobs = JobDescription.get_all()
        if jobs:
            latest_job = jobs[0]
            db_context = {
                "latest_job": {
                    "title": latest_job.get("job_title"),
                    "status": latest_job.get("status", "N/A"),
                    "created_at": latest_job.get("created_at", "N/A"),
                }
            }
    elif "consultant count" in user_message or "how many consultant" in user_message:
        consultants = ConsultantProfile.get_all()
        db_context = {"consultant_count": len(consultants)}

    response = get_recruitment_chat_response(request.message, db_context, history=history)
    return {"response": response} 