from pydantic import BaseModel
from datetime import datetime

class ConsultantsProfileDataSchema(BaseModel):
    id: int
    recruiter_id: int
    recruiter_email: str
    document_path: str
    created_at: datetime

    class Config:
        orm_mode = True 