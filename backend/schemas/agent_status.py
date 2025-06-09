from pydantic import BaseModel
from typing import Dict, Any, Optional

class AgentStatusResponse(BaseModel):
    job_id: int
    comparison: Dict[str, Any]
    ranking: Dict[str, Any]
    communication: Dict[str, Any]
    
    class Config:
        from_attributes = True