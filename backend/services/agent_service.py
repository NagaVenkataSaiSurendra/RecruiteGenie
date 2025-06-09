import asyncio
import json
from typing import List, Dict, Any, Tuple
from openai import AzureOpenAI
from sqlalchemy.orm import Session
from ..models.agent_status import AgentStatus
from ..models.consultant_profile import ConsultantProfile
from ..models.job_description import JobDescription
from ..config import settings

class AgentService:
    def __init__(self):
        self.client = AzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT
        )
        self.deployment_name = settings.AZURE_OPENAI_DEPLOYMENT_NAME

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

    async def comparison_agent(
        self, 
        db: Session, 
        job_description: JobDescription, 
        consultant_profiles: List[ConsultantProfile]
    ) -> List[Dict[str, Any]]:
        """
        Comparison Agent: Compare job description with consultant profiles using Azure OpenAI
        """
        job_id = job_description.id
        await self.update_agent_status(db, job_id, "comparison", "in-progress", 0)

        try:
            similarity_results = []
            total_profiles = len(consultant_profiles)

            for i, consultant in enumerate(consultant_profiles):
                # Create prompt for comparison
                prompt = self._create_comparison_prompt(job_description, consultant)
                
                # Call Azure OpenAI
                response = self.client.chat.completions.create(
                    model=self.deployment_name,
                    messages=[
                        {"role": "system", "content": "You are an expert recruitment AI that analyzes job-candidate compatibility."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )

                # Parse response
                analysis = self._parse_comparison_response(response.choices[0].message.content)
                
                similarity_results.append({
                    "consultant_id": consultant.id,
                    "consultant_name": consultant.name,
                    "consultant_email": consultant.email,
                    "experience": consultant.experience,
                    "similarity_score": analysis["similarity_score"],
                    "matching_skills": analysis["matching_skills"],
                    "missing_skills": analysis["missing_skills"],
                    "analysis": analysis["detailed_analysis"]
                })

                # Update progress
                progress = ((i + 1) / total_profiles) * 100
                await self.update_agent_status(db, job_id, "comparison", "in-progress", progress)
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)

            await self.update_agent_status(db, job_id, "comparison", "completed", 100)
            return similarity_results

        except Exception as e:
            await self.update_agent_status(db, job_id, "comparison", "error", 0)
            raise e

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

        try:
            # Create prompt for ranking
            prompt = self._create_ranking_prompt(similarity_results)
            
            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": "You are an expert recruitment AI that ranks candidates based on job compatibility."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2000
            )

            # Parse ranking response
            ranking_result = self._parse_ranking_response(response.choices[0].message.content)
            
            await self.update_agent_status(db, job_id, "ranking", "in-progress", 50)

            # Sort results based on AI ranking and similarity scores
            ranked_consultants = sorted(
                similarity_results, 
                key=lambda x: (x["similarity_score"], ranking_result.get(x["consultant_name"], 0)), 
                reverse=True
            )

            # Calculate overall similarity score (average of top 3)
            top_3_scores = [c["similarity_score"] for c in ranked_consultants[:3]]
            overall_score = sum(top_3_scores) / len(top_3_scores) if top_3_scores else 0

            await self.update_agent_status(db, job_id, "ranking", "completed", 100)
            return ranked_consultants, overall_score

        except Exception as e:
            await self.update_agent_status(db, job_id, "ranking", "error", 0)
            raise e

    async def communication_agent(
        self, 
        db: Session, 
        job_id: int, 
        job_title: str, 
        top_matches: List[Dict[str, Any]], 
        overall_score: float,
        email_service
    ) -> bool:
        """
        Communication Agent: Send emails based on matching results
        """
        await self.update_agent_status(db, job_id, "communication", "in-progress", 0)

        try:
            # Determine email recipients and content using AI
            prompt = self._create_communication_prompt(job_title, top_matches, overall_score)
            
            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": "You are an expert communication AI that determines appropriate email actions for recruitment."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            communication_decision = self._parse_communication_response(response.choices[0].message.content)
            
            await self.update_agent_status(db, job_id, "communication", "in-progress", 50)

            # Send appropriate emails
            email_sent = False
            if communication_decision["action"] == "send_matches" and top_matches:
                # Send to AR requestor
                recipients = ["ar_requestor@company.com"]  # In production, get from job creator
                email_sent = await email_service.send_matching_results_email(
                    recipients, job_title, top_matches, overall_score
                )
            elif communication_decision["action"] == "send_no_matches":
                # Send to recruiter
                recipients = ["recruiter@company.com"]  # In production, get from system config
                email_sent = await email_service.send_no_matches_email(recipients, job_title)

            await self.update_agent_status(db, job_id, "communication", "completed", 100)
            return email_sent

        except Exception as e:
            await self.update_agent_status(db, job_id, "communication", "error", 0)
            raise e

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