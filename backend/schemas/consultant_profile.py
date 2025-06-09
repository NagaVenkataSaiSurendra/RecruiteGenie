from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

class ConsultantProfileBase(BaseModel):
    name: str
    email: EmailStr
    skills: List[str]
    experience: int
    bio: Optional[str] = None
    availability: str = "available"

class ConsultantProfileCreate(ConsultantProfileBase):
    pass

class ConsultantProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    skills: Optional[List[str]] = None
    experience: Optional[int] = None
    bio: Optional[str] = None
    availability: Optional[str] = None
    rating: Optional[float] = None

class ConsultantProfileResponse(ConsultantProfileBase):
    id: int
    rating: float
    created_at: datetime
    
    class Config:
        from_attributes = True