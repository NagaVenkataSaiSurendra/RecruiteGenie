import asyncio
import json
from typing import List, Dict, Any, Tuple
from openai import AzureOpenAI
from sqlalchemy.orm import Session
from backend.models.agent_status import AgentStatus
from backend.models.consultant_profile import ConsultantProfile
from backend.models.job_description import JobDescription
from backend.config import get_settings
import faiss
import numpy as np
from backend.services.email_service import email_service
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from sklearn.metrics.pairwise import cosine_similarity
from backend.logging import logging

settings = get_settings()

class AgentService:
    def __init__(self):
        # Google Gemini setup
        genai.configure(api_key=settings.google_api_key)
        self.llm_model = genai.GenerativeModel(settings.llm)
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.index = None
        self.profile_id_map = {}

    async def update_agent_status(
        self, 
        db: Session, 
        job_id: int, 
        agent_type: str, 
        status: str, 
        progress: float
    ):
        """Update agent status in database"""
        agent_status = db.query(AgentStatus).filter(AgentStatus.job_id == job_id).first()
        if not agent_status:
            agent_status = AgentStatus(job_id=job_id)
            db.add(agent_status)

        if agent_type == "comparison":
            agent_status.comparison_status = status
            agent_status.comparison_progress = progress
        elif agent_type == "ranking":
            agent_status.ranking_status = status
            agent_status.ranking_progress = progress
        elif agent_type == "communication":
            agent_status.communication_status = status
            agent_status.communication_progress = progress

        db.commit()
        db.refresh(agent_status)

    def build_faiss_index(self, consultant_profiles):
        """Build a FAISS index from consultant profiles."""
        embeddings = []
        self.profile_id_map = {}
        for i, profile in enumerate(consultant_profiles):
            text = f"{profile.name} {profile.skills} {profile.experience} {profile.bio or ''}"
            emb = self.embedding_model.encode(text)
            embeddings.append(emb)
            self.profile_id_map[i] = profile
        embeddings = np.vstack(embeddings).astype('float32')
        self.index = faiss.IndexFlatL2(embeddings.shape[1])
        self.index.add(embeddings)

    def retrieve_similar_profiles(self, job_description, consultant_profiles, top_k=5):
        """Retrieve top_k similar consultant profiles using FAISS."""
        if self.index is None:
            self.build_faiss_index(consultant_profiles)
        jd_text = f"{job_description.title} {job_description.skills} {job_description.experience_required} {job_description.description}"
        jd_emb = self.embedding_model.encode(jd_text).astype('float32').reshape(1, -1)
        D, I = self.index.search(jd_emb, top_k)
        return [self.profile_id_map[idx] for idx in I[0]]

    async def comparison_agent(
        self, 
        db: Session, 
        job_description: JobDescription, 
        consultant_profiles: List[ConsultantProfile]
    ) -> List[Dict[str, Any]]:
        """
        Comparison Agent: Compare job description with consultant profiles using Google Gemini
        """
        job_id = job_description.job_id if hasattr(job_description, 'job_id') else job_description.id
        logging.info(f"Starting comparison agent for job_id={job_id}")
        await self.update_agent_status(db, job_id, "comparison", "in-progress", 0)

        # 1. Convert job description to embedding
        jd_text = f"{job_description.title} {job_description.skills} {job_description.experience_required} {job_description.description}"
        jd_emb = self.embedding_model.encode(jd_text).reshape(1, -1)
        logging.info(f"Job description embedding generated for job_id={job_id}")

        # 2. Convert all consultant profiles to embeddings
        consultant_texts = [
            f"{c.name} {c.skills} {c.experience} {getattr(c, 'bio', getattr(c, 'profile_summary', ''))}"
            for c in consultant_profiles
        ]
        consultant_embs = self.embedding_model.encode(consultant_texts)
        logging.info(f"Consultant profile embeddings generated for job_id={job_id}, num_profiles={len(consultant_profiles)}")

        # 3. Compute cosine similarity between JD and all consultant profiles
        similarities = cosine_similarity(jd_emb, consultant_embs)[0]
        top_indices = np.argsort(similarities)[-10:][::-1]  # Top 10 most similar
        top_profiles = [consultant_profiles[i] for i in top_indices]
        top_scores = [similarities[i] for i in top_indices]
        logging.info(f"Top 10 consultant profiles selected for LLM comparison for job_id={job_id}")

        # 4. Prepare batch prompt for LLM
        batch_prompt = self._create_batch_comparison_prompt(job_description, top_profiles, top_scores)
        logging.info(f"Calling LLM for job_id={job_id} with batch of {len(top_profiles)} profiles")
        logging.debug(f"LLM batch prompt: {batch_prompt}")
        try:
            response = self.llm_model.generate_content(batch_prompt)
            logging.info(f"LLM raw response for job_id={job_id}: {getattr(response, 'text', str(response))}")
        except Exception as e:
            logging.error(f"LLM call failed for job_id={job_id}: {e}")
            raise
        logging.info(f"LLM response received for job_id={job_id}")
        # Assume LLM returns a JSON list of results for each profile
        try:
            analysis_list = self._parse_batch_comparison_response(response.text)
        except Exception as e:
            logging.error(f"Failed to parse LLM response for job_id={job_id}: {e}")
            analysis_list = []

        # 5. Build similarity_results from LLM output
        similarity_results = []
        for i, consultant in enumerate(top_profiles):
            analysis = analysis_list[i] if i < len(analysis_list) else {
                "similarity_score": int(top_scores[i] * 100),
                "matching_skills": [],
                "missing_skills": [],
                "detailed_analysis": "LLM analysis unavailable"
            }
            similarity_results.append({
                "consultant_id": getattr(consultant, 'consultant_id', getattr(consultant, 'id', None)),
                "consultant_name": consultant.name,
                "consultant_email": consultant.email,
                "experience": consultant.experience,
                "similarity_score": analysis["similarity_score"],
                "matching_skills": analysis["matching_skills"],
                "missing_skills": analysis["missing_skills"],
                "analysis": analysis["detailed_analysis"]
            })
            logging.info(f"LLM result for consultant_id={similarity_results[-1]['consultant_id']} (job_id={job_id}): score={analysis['similarity_score']}, reason={analysis['detailed_analysis']}")
            progress = ((i + 1) / len(top_profiles)) * 100
            await self.update_agent_status(db, job_id, "comparison", "in-progress", progress)
        await self.update_agent_status(db, job_id, "comparison", "completed", 100)
        logging.info(f"Comparison agent completed for job_id={job_id}")
        return similarity_results

    def _create_batch_comparison_prompt(self, job_description, consultant_profiles, top_scores):
        jd_str = f"Title: {job_description.title}\nDepartment: {getattr(job_description, 'department', '')}\nDescription: {job_description.description}\nRequired Skills: {', '.join(job_description.skills)}\nExperience Required: {job_description.experience_required} years"
        profiles_str = "\n\n".join([
            f"Name: {c.name}\nSkills: {', '.join(c.skills) if isinstance(c.skills, list) else c.skills}\nExperience: {c.experience} years\nBio: {getattr(c, 'bio', getattr(c, 'profile_summary', 'Not provided'))}\nInitial Similarity: {int(top_scores[i]*100)}%"
            for i, c in enumerate(consultant_profiles)
        ])
        return f"""
        Compare the following job description with these consultant profiles. For each profile, provide a JSON object with:
        - similarity_score (0-100)
        - matching_skills (list)
        - missing_skills (list)
        - detailed_analysis (string)

        JOB DESCRIPTION:
        {jd_str}

        CONSULTANT PROFILES:
        {profiles_str}

        Respond as a JSON list, one object per consultant profile, in the same order.
        """

    def _parse_batch_comparison_response(self, response_text):
        import json
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']') + 1
        json_str = response_text[start_idx:end_idx]
        return json.loads(json_str)

    async def ranking_agent(
        self, 
        db: Session, 
        job_id: int, 
        similarity_results: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Ranking Agent: Rank consultant profiles using Azure OpenAI
        """
        await self.update_agent_status(db, job_id, "ranking", "in-progress", 0)
        ranked_consultants = sorted(similarity_results, key=lambda x: x["similarity_score"], reverse=True)
        top_3_scores = [c["similarity_score"] for c in ranked_consultants[:3]]
        overall_score = sum(top_3_scores) / len(top_3_scores) if top_3_scores else 0
        await self.update_agent_status(db, job_id, "ranking", "completed", 100)
        return ranked_consultants, overall_score

    async def communication_agent(
        self, 
        db: Session, 
        job_id: int, 
        job_title: str, 
        top_matches: List[Dict[str, Any]], 
        overall_score: float
    ) -> bool:
        """
        Communication Agent: Send emails based on matching results
        """
        await self.update_agent_status(db, job_id, "communication", "in-progress", 0)
        email_sent = False
        if overall_score >= 70 and top_matches:
            recipients = ["ar_requestor@company.com"]
            email_sent = await email_service.send_matching_results_email(recipients, job_title, top_matches[:3], overall_score)
        else:
            recipients = ["recruiter@company.com"]
            email_sent = await email_service.send_no_matches_email(recipients, job_title)
        await self.update_agent_status(db, job_id, "communication", "completed", 100)
        return email_sent

    def _create_comparison_prompt(self, job_description: JobDescription, consultant: ConsultantProfile) -> str:
        """Create prompt for comparison agent"""
        return f"""
        Analyze the compatibility between this job description and consultant profile:

        JOB DESCRIPTION:
        Title: {job_description.title}
        Department: {job_description.department}
        Description: {job_description.description}
        Required Skills: {', '.join(job_description.skills)}
        Experience Required: {job_description.experience_required} years

        CONSULTANT PROFILE:
        Name: {consultant.name}
        Skills: {', '.join(consultant.skills)}
        Experience: {consultant.experience} years
        Bio: {consultant.bio or 'Not provided'}

        Please provide a detailed analysis in the following JSON format:
        {{
            "similarity_score": <number between 0-100>,
            "matching_skills": [<list of skills that match>],
            "missing_skills": [<list of required skills the consultant lacks>],
            "detailed_analysis": "<brief explanation of the match quality>"
        }}

        Consider:
        1. Skill overlap and relevance
        2. Experience level compatibility
        3. Domain expertise alignment
        4. Overall fit for the role
        """

    def _create_ranking_prompt(self, similarity_results: List[Dict[str, Any]]) -> str:
        """Create prompt for ranking agent"""
        candidates_summary = "\n".join([
            f"- {result['consultant_name']}: {result['similarity_score']}% match, {result['experience']} years exp"
            for result in similarity_results
        ])

        return f"""
        Rank these consultant candidates based on their overall suitability:

        CANDIDATES:
        {candidates_summary}

        Consider:
        1. Similarity score
        2. Experience level
        3. Skill relevance
        4. Overall profile strength

        Provide ranking scores (0-100) for each candidate in JSON format:
        {{
            "candidate_name_1": <ranking_score>,
            "candidate_name_2": <ranking_score>,
            ...
        }}
        """

    def _create_communication_prompt(self, job_title: str, top_matches: List[Dict[str, Any]], overall_score: float) -> str:
        """Create prompt for communication agent"""
        return f"""
        Determine the appropriate communication action for this recruitment matching result:

        JOB: {job_title}
        OVERALL MATCH SCORE: {overall_score}%
        NUMBER OF MATCHES: {len(top_matches)}
        TOP MATCH SCORE: {top_matches[0]['similarity_score'] if top_matches else 0}%

        Rules:
        - If overall score >= 70% and at least 1 good match: send matches to AR requestor
        - If overall score < 70% or no good matches: notify recruiter about poor matches

        Respond in JSON format:
        {{
            "action": "send_matches" or "send_no_matches",
            "reason": "<brief explanation>"
        }}
        """

    def _parse_comparison_response(self, response: str) -> Dict[str, Any]:
        """Parse comparison agent response"""
        try:
            # Extract JSON from response
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            json_str = response[start_idx:end_idx]
            return json.loads(json_str)
        except:
            # Fallback parsing
            return {
                "similarity_score": 50,
                "matching_skills": [],
                "missing_skills": [],
                "detailed_analysis": "Analysis parsing failed"
            }

    def _parse_ranking_response(self, response: str) -> Dict[str, float]:
        """Parse ranking agent response"""
        try:
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            json_str = response[start_idx:end_idx]
            return json.loads(json_str)
        except:
            return {}

    def _parse_communication_response(self, response: str) -> Dict[str, str]:
        """Parse communication agent response"""
        try:
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            json_str = response[start_idx:end_idx]
            return json.loads(json_str)
        except:
            return {"action": "send_matches", "reason": "Default action"}

agent_service = AgentService()