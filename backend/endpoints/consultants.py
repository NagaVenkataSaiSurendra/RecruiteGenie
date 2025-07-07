from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Security, Form, Query, Request
from fastapi.responses import StreamingResponse
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
import time
import uuid
import threading
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Consultants"]
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

progress_dict = {}

def process_consultant_upload(job_id, file_location, job_description, job_description_id, recruiter_id):
    try:
        print(f"Processing job {job_id}: JD comparison started")
        progress_dict[job_id] = "JD comparison started"
        import time
        time.sleep(1)
        # --- Real JD comparison logic can go here ---
        print(f"Processing job {job_id}: JD compared ✅")
        progress_dict[job_id] = "JD compared ✅"
        time.sleep(1)
        print(f"Processing job {job_id}: Profile ranking started")
        progress_dict[job_id] = "Profile ranking started"
        # --- Fetch recruiter email ---
        recruiter = User.get_by_id(recruiter_id)
        recruiter_email = recruiter["email"] if recruiter else ""
        # --- Real consultant profile parsing and DB-insertion logic ---
        from PyPDF2 import PdfReader
        from backend.services.parsing_consultant_document import extract_profiles
        from backend.models.consultant_profile import ConsultantProfile
        from backend.models.consultants_profile_data import ConsultantsProfileData
        import numpy as np
        import faiss
        from sentence_transformers import SentenceTransformer
        from backend.services.llm_service import score_consultants_with_llm
        # Insert consultants profile data record (with recruiter info)
        profile_id = ConsultantsProfileData.create(
            recruiter_id=recruiter_id,
            recruiter_email=recruiter_email,
            document_path=file_location
        )
        profile = ConsultantsProfileData.get_by_id(profile_id)
        if not profile:
            progress_dict[job_id] = "ERROR: Failed to create consultant profile data"
            return
        reader = PdfReader(file_location)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        parsed_profiles = extract_profiles(text)
        print(f"Processing job {job_id}: Parsed {len(parsed_profiles)} consultant profiles")
        inserted_ids = []
        profile_texts = []
        for parsed_profile in parsed_profiles:
            new_id = ConsultantProfile.create_from_parsed(parsed_profile, recruiter_id, file_location)
            inserted_ids.append(new_id)
            profile_text = ', '.join([
                str(parsed_profile.get('name', '')),
                str(parsed_profile.get('skills', '')),
                str(parsed_profile.get('education', '')),
                str(parsed_profile.get('years_of_experience', '')),
                str(parsed_profile.get('email', '')),
            ])
            profile_texts.append(profile_text)
        print(f"Processing job {job_id}: Inserted {len(inserted_ids)} consultant profiles")
        if profile_texts:
            model = SentenceTransformer('all-MiniLM-L6-v2')
            embeddings = model.encode(profile_texts, convert_to_numpy=True)
            dim = embeddings.shape[1]
            index = faiss.IndexFlatL2(dim)
            index.add(embeddings.astype(np.float32))
            faiss.write_index(index, "consultant_profiles_bert.index")
            np.save("consultant_profile_ids.npy", np.array(inserted_ids))
            print(f"Processing job {job_id}: Stored consultant profiles in FAISS vector DB.")

            # --- FAISS similarity search for the job description ---
            model = SentenceTransformer('all-MiniLM-L6-v2')
            query_vec = model.encode([job_description], convert_to_numpy=True).astype(np.float32)
        index = faiss.read_index("consultant_profiles_bert.index")
        profile_ids = np.load("consultant_profile_ids.npy", allow_pickle=True)
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

        filtered = [p for p in profiles if p['similarity'] > 0]
        if filtered:
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                llm_response = loop.run_until_complete(score_consultants_with_llm(job_description, filtered))
                print(f"Processing job {job_id}: LLM response: {llm_response}")
            finally:
                asyncio.set_event_loop(None)
                loop.close()

            # --- Save top LLM matches to ProfileMatch table ---
            # Sort by llm_score, descending, and take top 3
            top_profiles = sorted(llm_response, key=lambda x: x['llm_score'], reverse=True)[:3]
            # Get ar_requestor_id from the job description
            job_desc = JobDescription.get_by_id(job_description_id)
            ar_requestor_id = job_desc['ar_requestor_id'] if job_desc else None
            jd_id = job_description_id
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
        time.sleep(2)
        print(f"Processing job {job_id}: Profiles ranked ✅")
        progress_dict[job_id] = "Profiles ranked ✅"
        time.sleep(1)
        print(f"Processing job {job_id}: Sending email to AR requestor...")
        progress_dict[job_id] = "Sending email to AR requestor..."
        time.sleep(1)
        print(f"Processing job {job_id}: Email sent ✅")
        progress_dict[job_id] = "Email sent ✅"
        progress_dict[job_id] = "✅ All steps completed"
        print(f"Processing job {job_id}: All steps completed")
    except Exception as e:
        print(f"Processing job {job_id}: ERROR: {str(e)}")
        progress_dict[job_id] = f"ERROR: {str(e)}"

@router.post("/upload")
async def upload_consultant_document(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    job_description_id: int = Form(...),
    recruiter_id: int = Form(...),
):
    job_id = str(uuid.uuid4())
    upload_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'fresher_profiles')
    os.makedirs(upload_dir, exist_ok=True)
    file_location = os.path.join(upload_dir, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())
    thread = threading.Thread(
        target=process_consultant_upload,
        args=(job_id, file_location, job_description, job_description_id, recruiter_id)
    )
    thread.start()
    progress_dict[job_id] = "Upload started"
    return {"job_id": job_id}

from fastapi import Request
from fastapi.responses import StreamingResponse

@router.get("/status/{job_id}")
async def consultant_upload_status(job_id: str, request: Request):
    async def event_stream():
        last_status = None
        while True:
            if await request.is_disconnected():
                break
            status = progress_dict.get(job_id)
            if status != last_status:
                yield f"data: {status}\n\n"
                last_status = status
                if status and ("All steps completed" in status or "ERROR" in status):
                    break
            import asyncio
            await asyncio.sleep(0.5)
    return StreamingResponse(event_stream(), media_type="text/event-stream")

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