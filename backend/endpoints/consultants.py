from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Security, Form, Query
from backend.models.consultant_profile import ConsultantProfile, ConsultantUpload
from backend.models.user import User
from backend.schemas.consultant_profile import ConsultantProfileCreate, ConsultantProfileResponse, ConsultantProfileUpdate
from backend.services.auth_service import auth_service
from backend.security import bearer_scheme
import logging
import os
from .utils import extract_text_from_file
from sqlalchemy.orm import Session
from backend.database import get_db_connection
from backend.models.consultants_profile_data import ConsultantsProfileData
from backend.schemas.consultants_profile_data import ConsultantsProfileDataSchema
from PyPDF2 import PdfReader
from backend.services.parsing_consultant_document import extract_profiles
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from backend.services.llm_service import score_consultants_with_llm

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Consultants"],
    dependencies=[Depends(auth_service.get_current_user)]
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=ConsultantProfileResponse, status_code=201, dependencies=[])
async def create_consultant(profile: ConsultantProfileCreate):
    """Register a new consultant profile (no authentication required)"""
    try:
        logger.info(f"Creating new consultant profile (registration)")
        profile_id = ConsultantProfile.create(
            name=profile.name,
            email=profile.email,
            experience=profile.experience,
            skills=profile.skills,
            profile_summary=profile.profile_summary
        )
        new_profile = ConsultantProfile.get_by_id(profile_id)
        return dict(new_profile)
    except Exception as e:
        logger.error(f"Error creating consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/", response_model=List[ConsultantProfileResponse])
async def get_all_consultants(
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Get all consultant profiles"""
    try:
        logger.info("Retrieving all consultant profiles")
        consultants = ConsultantProfile.get_all()
        logger.info(f"Consultants: {consultants}")
        return [dict(consultant) for consultant in consultants]
    except Exception as e:
        logger.error(f"Error retrieving consultant profiles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{consultant_id}", response_model=ConsultantProfileResponse)
async def get_consultant_profile(
    consultant_id: int,
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Get a specific consultant profile"""
    try:
        logger.info(f"Retrieving consultant profile with ID: {consultant_id}")
        consultant = ConsultantProfile.get_by_id(consultant_id)
        if consultant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultant profile not found"
            )
        return consultant.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/{consultant_id}", response_model=ConsultantProfileResponse)
async def update_consultant_profile(
    consultant_id: int,
    consultant_update: ConsultantProfileUpdate,
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Update a consultant profile"""
    try:
        logger.info(f"Updating consultant profile with ID: {consultant_id}")
        consultant = ConsultantProfile.get_by_id(consultant_id)
        if consultant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultant profile not found"
            )
        
        # Update fields
        for field, value in consultant_update.dict(exclude_unset=True).items():
            setattr(consultant, field, value)
        
        consultant.update(consultant_id)
        return consultant.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/{consultant_id}")
async def delete_consultant_profile(
    consultant_id: int,
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Delete a consultant profile"""
    try:
        logger.info(f"Deleting consultant profile with ID: {consultant_id}")
        consultant = ConsultantProfile.get_by_id(consultant_id)
        if consultant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consultant profile not found"
            )
        
        ConsultantProfile.delete(consultant_id)
        return {"message": "Consultant profile deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting consultant profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/upload")
async def upload_consultant_document(
    file: UploadFile = File(...),
    recruiter_id: int = Form(...),
    job_description: str = Form(...),
    credentials = Security(bearer_scheme),
    current_user: dict = Depends(auth_service.get_current_user)
):
    """Upload a consultant profile document, store it on disk, and insert a record in the consultants_profile_data table with recruiter info. Also parse consultant profiles from the document."""
    try:
        logger.info(f"Received upload request from recruiter_id: {recruiter_id}")
        # Save file
        upload_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'fresher_profiles')
        os.makedirs(upload_dir, exist_ok=True)
        file_location = os.path.join(upload_dir, file.filename)
        with open(file_location, "wb") as f:
            f.write(await file.read())
        logger.info(f"File saved to: {file_location}")
        # Get recruiter email using User.get_by_id
        recruiter = User.get_by_id(recruiter_id)
        if not recruiter:
            raise HTTPException(status_code=404, detail="Recruiter not found")
        recruiter_email = recruiter["email"]
        # Insert consultants profile data record
        profile_id = ConsultantsProfileData.create(
            recruiter_id=recruiter_id,
            recruiter_email=recruiter_email,
            document_path=file_location
        )
        profile = ConsultantsProfileData.get_by_id(profile_id)
        if not profile:
            raise HTTPException(status_code=500, detail="Failed to create consultant profile data")
        # --- Integrate parsing logic ---
        reader = PdfReader(file_location)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        parsed_profiles = extract_profiles(text)
        logger.info(f"Parsed consultant profiles: {parsed_profiles}")
        # Insert each parsed profile into the consultant_profiles table
        inserted_ids = []
        profile_texts = []
        for parsed_profile in parsed_profiles:
            new_id = ConsultantProfile.create_from_parsed(parsed_profile, recruiter_id, file_location)
            inserted_ids.append(new_id)
            # Concatenate fields for vectorization
            profile_text = ', '.join([
                str(parsed_profile.get('name', '')),
                str(parsed_profile.get('skills', '')),
                str(parsed_profile.get('education', '')),
                str(parsed_profile.get('years_of_experience', '')),
                str(parsed_profile.get('email', '')),
            ])
            profile_texts.append(profile_text)
        logger.info(f"Inserted consultant profile IDs: {inserted_ids}")
        # --- Vectorization and FAISS ---
        if profile_texts:
            model = SentenceTransformer('all-MiniLM-L6-v2')
            embeddings = model.encode(profile_texts, convert_to_numpy=True)
            dim = embeddings.shape[1]
            index = faiss.IndexFlatL2(dim)
            index.add(embeddings.astype(np.float32))
            faiss.write_index(index, "consultant_profiles_bert.index")
            np.save("consultant_profile_ids.npy", np.array(inserted_ids))
            logger.info("Stored consultant profiles in FAISS vector DB.")
        # --- Always get top 3 LLM-scored profiles from DB ---
        # Load FAISS index and ID mapping
        index = faiss.read_index("consultant_profiles_bert.index")
        profile_ids = np.load("consultant_profile_ids.npy", allow_pickle=True)
        # Vectorize the query
        model = SentenceTransformer('all-MiniLM-L6-v2')
        query_vec = model.encode([job_description], convert_to_numpy=True).astype(np.float32)
        # Search FAISS
        D, I = index.search(query_vec, 10)
        matched_ids = profile_ids[I[0]].tolist()
        similarities = 100 - D[0]  # Convert L2 distance to similarity (approximate)
        # Fetch profiles and pair with similarity
        profiles = []
        for idx, pid in enumerate(matched_ids):
            profile = ConsultantProfile.get_by_id(pid)
            if profile:
                profile['similarity'] = similarities[idx]
                profiles.append(profile)
        # Filter by similarity > 0 (show all for robustness)
        filtered = [p for p in profiles if p['similarity'] > 0]
        if not filtered:
            llm_scores = []
        else:
            # Before returning, ensure all llm_scores and profile fields are serializable
            def to_serializable(profile):
                # Convert all numpy.float32 to float
                for k, v in profile.items():
                    if isinstance(v, np.floating):
                        profile[k] = float(v)
                return profile
            scored_profiles = await score_consultants_with_llm(job_description, filtered)
            top_profiles = sorted(scored_profiles, key=lambda x: x['llm_score'], reverse=True)[:3]
            llm_scores = [to_serializable(p) for p in top_profiles]
        return {"message": "Upload, vector DB storage, and LLM scoring complete", "profile_ids": inserted_ids, "llm_scores": llm_scores}
    except Exception as e:
        import traceback
        logger.error(f"Error uploading consultant document: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/search")
async def search_consultant_profiles(
    query: str = Query(..., description="Search query, e.g. job description or required skills"),
    top_k: int = Query(10, description="Number of top matches to return")
):
    try:
        # Load FAISS index and ID mapping
        index = faiss.read_index("consultant_profiles_bert.index")
        profile_ids = np.load("consultant_profile_ids.npy", allow_pickle=True)
        # Vectorize the query
        model = SentenceTransformer('all-MiniLM-L6-v2')
        query_vec = model.encode([query], convert_to_numpy=True).astype(np.float32)
        # Search FAISS
        D, I = index.search(query_vec, top_k)
        matched_ids = profile_ids[I[0]].tolist()
        similarities = 100 - D[0]  # Convert L2 distance to similarity (approximate)
        # Fetch profiles and pair with similarity
        profiles = []
        for idx, pid in enumerate(matched_ids):
            profile = ConsultantProfile.get_by_id(pid)
            if profile:
                profile['similarity'] = similarities[idx]
                profiles.append(profile)
        # Filter by similarity > 75
        filtered = [p for p in profiles if p['similarity'] > 75]
        if not filtered:
            return {"results": []}
        # Score with Google LLM
        scored_profiles = await score_consultants_with_llm(query, filtered)
        # Sort by LLM score, descending, and return top 3
        top_profiles = sorted(scored_profiles, key=lambda x: x['llm_score'], reverse=True)[:3]
        return {"results": top_profiles}
    except Exception as e:
        logger.error(f"Error in semantic search: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )