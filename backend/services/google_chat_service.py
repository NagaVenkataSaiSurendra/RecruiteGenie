import google.generativeai as genai
from backend.config import get_settings

settings = get_settings()

# Configure Google AI with API key
if settings.google_api_key:
    genai.configure(api_key=settings.google_api_key)
else:
    print("Warning: GOOGLE_API_KEY not found in environment variables")

RECRUITMENT_KEYWORDS = [
    'consultant', 'profile', 'job', 'recruit', 'candidate', 'resume', 'cv', 'interview',
    'skills', 'experience', 'hiring', 'position', 'role', 'match', 'vacancy', 'opening',
    'shortlist', 'screen', 'placement', 'recruitment', 'headhunt', 'talent', 'employer',
    'employee', 'offer', 'salary', 'compensation', 'background check', 'reference',
    'profile match', 'job description', 'JD', 'profile data', 'consultant data', 'profile matches'
]

POLITE_REFUSAL = (
    "I'm here to assist with recruitment-related questions only. "
    "Please ask something about consultant profiles, job descriptions, or the recruitment process."
)

def is_recruitment_related(message: str) -> bool:
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in RECRUITMENT_KEYWORDS)

def get_recruitment_chat_response(message: str, db_context: dict = None) -> str:
    if not is_recruitment_related(message):
        return POLITE_REFUSAL
    
    if not settings.google_api_key:
        return "Google AI service is not configured. Please check your API key."
    
    try:
        # Add context from database if provided
        prompt = (
            "You are a recruitment AI assistant. "
            "Strictly answer in 2 to 3 lines, using minimal words. "
            "Be concise and to the point.\n"
            f"User: {message}"
        )
        if db_context:
            prompt += f"\n\nContext: {str(db_context)}"
        
        # Use Google's Gemini Pro model
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        return response.text.strip() if hasattr(response, 'text') else str(response)
    
    except Exception as e:
        print(f"Google AI error: {e}")
        return "Sorry, I'm having trouble connecting to the AI service right now. Please try again later." 