from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any, Optional

class MatchingRequest(BaseModel):
    job_id: int
    consultant_ids: List[int]

class MatchingResultResponse(BaseModel):
    id: int
    job_id: int
    job_title: str
    department: str
    similarity_score: float
    top_matches: List[Dict[str, Any]]
    email_sent: bool
    email_recipients: List[str] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AgentStatusResponse(BaseModel):
    job_id: int
    status: str
    progress: float
    message: Optional[str] = None
    last_updated: datetime