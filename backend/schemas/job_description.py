from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class JobDescriptionBase(BaseModel):
    job_id: Optional[int] = None
    title: str
    department: str
    description: str
    skills: List[str]
    experience_required: int
    status: str = "active"
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class JobDescriptionCreate(BaseModel):
    title: str
    department: str
    description: str
    skills: List[str]
    experience_required: int
    status: str = "active"
    user_id: Optional[int] = None

class JobDescriptionUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_required: Optional[int] = None
    status: Optional[str] = None
    user_id: Optional[int] = None

class JobDescriptionResponse(BaseModel):
    job_id: int
    title: str
    department: str
    description: str
    skills: List[str]
    experience_required: int
    status: str
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True