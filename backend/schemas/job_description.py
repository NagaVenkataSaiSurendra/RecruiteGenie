from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class JobDescriptionBase(BaseModel):
    job_title: str
    department: str
    job_description: str
    skills: List[str]
    experience_required: int
    status: str = "active"
    document_path: Optional[str] = None

class JobDescriptionCreate(JobDescriptionBase):
    pass

class JobDescriptionUpdate(BaseModel):
    job_title: Optional[str] = None
    department: Optional[str] = None
    job_description: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_required: Optional[int] = None
    status: Optional[str] = None

class JobDescriptionResponse(JobDescriptionBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True