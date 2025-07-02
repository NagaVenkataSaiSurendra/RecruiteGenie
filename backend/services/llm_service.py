import os
import httpx
import json
import re
from backend.config import get_settings
from openai import AzureOpenAI

settings = get_settings()
client = AzureOpenAI(
    api_key=settings.azure_openai_api_key,
    api_version=settings.azure_openai_api_version,
    azure_endpoint=settings.azure_openai_endpoint,
)

def build_llm_prompt(jd_text, consultants):
    prompt = f"Job Description:\n{jd_text}\n\nConsultant Profiles:\n"
    for c in consultants:
        skills = ', '.join(c['skills']) if isinstance(c['skills'], list) else str(c['skills'])
        prompt += f"Email: {c.get('email','')}\nName: {c.get('name','')}\nExperience: {c.get('experience','')}\nSkills: {skills}\nEducation: {c.get('education','')}\n\n"
    prompt += (
        "For each profile, give a score (0-100) for fit to the job description, "
        "and a brief reasoning for the score.Strictly Respond as JSON avaiding any unncessary text: "
        "{\"<email>\": {\"score\": number, \"reasoning\": string}, ...}. "
        "Use the consultant's email as the key in the JSON response."
    )
    return prompt

async def score_consultants_with_llm(jd_text, consultants):
    prompt = build_llm_prompt(jd_text, consultants)
    
    # Prepare the system and user messages
    system_message = "You are an expert technical recruiter assistant."
    user_message = prompt

    # Create the API request using the specified format
    response = client.chat.completions.create(
            model=settings.azure_openai_deployment_name,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            temperature=0.34,
        )

    # Extract the evaluation result from the response
    evaluation_result = response.choices[0].message.content.strip()
    print("Evaluation result:", evaluation_result)

    try:
        # Load the evaluation result as JSON
        scores = json.loads(evaluation_result)
        print("Scores:", scores)
    except json.JSONDecodeError as e:
        print("LLM JSON parse error:", e)
        scores = {}

    # Update each consultant with their respective scores
    for c in consultants:
        email = c.get('email')
        profile_result = scores.get(email, {})
        c['llm_score'] = profile_result.get('score', 0)
        c['llm_reasoning'] = profile_result.get('reasoning', '')

    return consultants
