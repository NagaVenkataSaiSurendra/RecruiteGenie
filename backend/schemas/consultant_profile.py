from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional

class ConsultantProfileBase(BaseModel):
    consultant_id: Optional[int] = None
    name: str
    email: EmailStr
    skills: List[str]
    experience: int
    bio: Optional[str] = None
    availability: str = "available"
    rating: Optional[float] = None
    created_at: Optional[datetime] = None

class ConsultantProfileCreate(BaseModel):
    name: str
    email: EmailStr
    skills: List[str]
    experience: int
    bio: Optional[str] = None
    availability: str = "available"

class ConsultantProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    skills: Optional[List[str]] = None
    experience: Optional[int] = None
    bio: Optional[str] = None
    availability: Optional[str] = None
    rating: Optional[float] = None

class ConsultantProfileResponse(BaseModel):
    consultant_id: int
    name: str
    email: EmailStr
    skills: List[str]
    experience: int
    bio: Optional[str]
    availability: str
    rating: Optional[float]
    created_at: datetime
    class Config:
        from_attributes = True