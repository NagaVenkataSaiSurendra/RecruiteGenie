from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class JobDescriptionBase(BaseModel):
    title: str
    department: str
    description: str
    skills: List[str]
    experience_required: int
    status: str = "active"
    document_path: Optional[str] = None

class JobDescriptionCreate(JobDescriptionBase):
    pass

class JobDescriptionUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_required: Optional[int] = None
    status: Optional[str] = None

class JobDescriptionResponse(JobDescriptionBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True