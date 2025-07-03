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
from backend.models.profile_match import ProfileMatch
from backend.models.job_description import JobDescription
from backend.services.email_service import email_service
from pydantic import BaseModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Consultants"],
    dependencies=[Depends(auth_service.get_current_user)]
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

class NotifyMatchesRequest(BaseModel):
    job_description_id: int

def get_ar_requestor_by_id(ar_requestor_id):
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, full_name, email, created_at FROM ar_requestors WHERE id = %s;", (ar_requestor_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "id": row[0],
                    "full_name": row[1],
                    "email": row[2],
                    "created_at": row[3]
                }
            return None

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
    job_description_id: int = Form(...),
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
            def to_serializable(profile):
                for k, v in profile.items():
                    if isinstance(v, np.floating):
                        profile[k] = float(v)
                return profile
            scored_profiles = await score_consultants_with_llm(job_description, filtered)
            top_profiles = sorted(scored_profiles, key=lambda x: x['llm_score'], reverse=True)[:3]
            llm_scores = [to_serializable(p) for p in top_profiles]

            # --- Store top matches in profile_matches table ---
            # Fetch ar_requestor_id from the job description
            job_desc = JobDescription.get_by_id(job_description_id)
            ar_requestor_id = job_desc['ar_requestor_id'] if job_desc else None
            jd_id = job_description_id
            # Insert top matches
            for p in top_profiles:
                ProfileMatch.create(
                    ar_requestor_id=ar_requestor_id,
                    recruiter_id=recruiter_id,
                    profile_id=p.get('id'),
                    candidate_name=p.get('name'),
                    llm_score=p.get('llm_score'),
                    llm_reasoning=p.get('llm_reasoning'),
                    job_description_id=jd_id
                )
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

@router.post("/notify-matches")
async def notify_matches(payload: NotifyMatchesRequest):
    """Notify recruiter and AR requestor of top matches for a job description."""
    try:
        job_description_id = payload.job_description_id
        matches = ProfileMatch.get_by_job_description_id(job_description_id)
        if not matches:
            return {"message": "No matches found for this job description."}
        # Get recruiter and AR requestor emails
        ar_requestor_id = matches[0]["ar_requestor_id"]
        recruiter_id = matches[0]["recruiter_id"]
        ar_requestor = get_ar_requestor_by_id(ar_requestor_id)
        recruiter = User.get_by_id(recruiter_id)
        if not ar_requestor or not recruiter:
            return {"message": "Recruiter or AR Requestor not found."}
        recipients = [ar_requestor["email"], recruiter["email"]]
        # Get job description
        job_desc = JobDescription.get_by_id(job_description_id)
        job_title = job_desc["job_title"] if job_desc else "Job Description"
        department = job_desc.get("department", "") if job_desc else ""
        experience_required = job_desc.get("experience_required", "") if job_desc else ""
        job_description_text = job_desc.get("job_description", "") if job_desc else ""
        # Prepare top matches details for email
        top_matches = []
        for m in matches:
            # Fetch full profile details
            profile = ConsultantProfile.get_by_id(m["profile_id"])
            top_matches.append({
                "consultant_name": m["candidate_name"],
                "score": m["llm_score"],
                "llm_reasoning": m["llm_reasoning"],
                "experience": profile.get("experience") if profile else None,
                "skills": profile.get("skills") if profile else [],
                "email": profile.get("email") if profile else None
            })
        # Compose detailed email content
        html_content = f"""
        <html><body>
        <h2>Top Consultant Matches for {job_title}</h2>
        <p><b>Department:</b> {department}<br>
        <b>Experience Required:</b> {experience_required} years<br>
        <b>Description:</b> {job_description_text}</p>
        <h3>Matched Profiles:</h3>
        <ul>
        {''.join([f'<li><b>{tm["consultant_name"]}</b> (Experience: {tm["experience"]} yrs, Email: {tm["email"]})<br>Skills: {", ".join(tm["skills"])}<br>Score: {tm["score"]}<br>Reasoning: {tm["llm_reasoning"]}</li>' for tm in top_matches])}
        </ul>
        <p>Regards,<br>RecruitGenie Team</p>
        </body></html>
        """
        # Send email
        await email_service.send_matching_results_email(
            recipients=recipients,
            job_title=job_title,
            top_matches=top_matches,
            similarity_score=top_matches[0]["score"] if top_matches else 0
        )
        return {"message": "Notification email sent to recruiter and AR requestor."}
    except Exception as e:
        return {"message": f"Failed to send notification: {str(e)}"}

@router.get("/matching-results/grouped")
def get_grouped_matching_results():
    """Return top 3 matches for each job description, grouped by job description."""
    from backend.models.profile_match import ProfileMatch
    from backend.models.job_description import JobDescription
    from backend.models.consultant_profile import ConsultantProfile
    import sys
    grouped = []
    # Get all job descriptions
    all_jds = JobDescription.get_all()
    print(f"\n--- DEBUG: Found {len(all_jds)} job descriptions ---", file=sys.stderr)
    for jd in all_jds:
        jd_id = jd['id'] if isinstance(jd, dict) else jd.id
        print(f"\n--- DEBUG: Processing JD id={jd_id} ---", file=sys.stderr)
        matches = ProfileMatch.get_by_job_description_id(jd_id)
        print(f"--- DEBUG: Found {len(matches)} matches for JD id={jd_id} ---", file=sys.stderr)
        # Sort and take top 3
        top_matches = sorted(matches, key=lambda x: x['llm_score'], reverse=True)[:3]
        print(f"--- DEBUG: Top matches for JD id={jd_id}: {top_matches} ---", file=sys.stderr)
        formatted_matches = []
        for m in top_matches:
            profile = ConsultantProfile.get_by_id(m['profile_id'])
            print(f"--- DEBUG: Profile for match: {profile} ---", file=sys.stderr)
            formatted_matches.append({
                'consultant_name': m['candidate_name'],
                'score': m['llm_score'],
                'llm_reasoning': m['llm_reasoning'],
                'experience': profile.get('experience') if profile else None,
                'skills': profile.get('skills') if profile else [],
            })
        grouped.append({
            'job_description_id': jd_id,
            'job_title': jd['job_title'] if isinstance(jd, dict) else jd.title,
            'department': jd.get('department', ''),
            'top_matches': formatted_matches
        })
    print(f"\n--- DEBUG: Final grouped result: {grouped} ---\n", file=sys.stderr)
    return grouped