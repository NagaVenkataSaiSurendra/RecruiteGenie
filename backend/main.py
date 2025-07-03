from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection, setup_database
from config import get_settings
from init_db import init_db
from endpoints import auth_router, jobs_router, consultants_router, matching_router
from backend.security import bearer_scheme

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="RecruitMatch API",
    description="""
    API for automated job description and consultant profile matching system.
    
    Features:
    - Document similarity comparison between JDs and consultant profiles
    - AI-based ranking of consultant profiles
    - Automated email notifications
    - Real-time status tracking for AR requestors and recruiters
    """,
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from endpoints import auth, jobs, consultants, matching

# Include routers with proper prefixes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(jobs_router, prefix="/api/jobs", tags=["Job Descriptions"])
app.include_router(consultants_router, prefix="/api/consultants", tags=["Consultant Profiles"])
app.include_router(matching_router, prefix="/api/matching", tags=["Matching"])

@app.on_event("startup")
async def startup_event():
    setup_database()
    print("Database and pool setup complete.")

@app.get("/")
async def root():
    return {
        "message": "Welcome to RecruitMatch API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True
    ) 