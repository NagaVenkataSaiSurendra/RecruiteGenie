from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db_connection, release_db_connection, close_all_connections
from .config import settings
from .init_db import init_db

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

# Database dependency
def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        release_db_connection(conn)

# Import and include routers
from .endpoints import auth, jobs, consultants, matching

# Include routers with proper prefixes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Job Descriptions"])
app.include_router(consultants.router, prefix="/api/consultants", tags=["Consultant Profiles"])
app.include_router(matching.router, prefix="/api/matching", tags=["Matching"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to RecruitMatch API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        init_db()
    except Exception as e:
        print(f"Error initializing database: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connections when the application shuts down"""
    close_all_connections()

if __name__ == "__main__":
    import uvicorn
    try:
        uvicorn.run(
            "main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG
        )
    except Exception as e:
        print(f"Error starting server: {e}")
        close_all_connections() 