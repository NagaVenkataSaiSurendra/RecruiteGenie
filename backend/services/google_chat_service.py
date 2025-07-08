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

POLITE_GREETINGS = [
    "hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"
]

def is_recruitment_related(message: str) -> bool:
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in RECRUITMENT_KEYWORDS)

def is_greeting(message: str) -> bool:
    message_lower = message.lower().strip()
    return any(message_lower.startswith(greet) for greet in POLITE_GREETINGS)

def get_recruitment_chat_response(message: str, db_context: dict = None, history: list = None) -> str:
    if not settings.google_api_key:
        return "Google AI service is not configured. Please check your API key."
    try:
        # Compose system prompt
        prompt = (
            "You are a helpful, polite AI assistant for a recruitment platform. "
            "You can answer questions about consultant profiles, job descriptions, hiring, and recruitment. "
            "If the user asks something unrelated to recruitment, gently redirect them to recruitment topics. "
            "If the user greets you or makes small talk, respond naturally and politely. "
            "Keep answers concise (2-3 lines).\n"
        )
        if history:
            prompt += "Chat history (user and bot):\n"
            for msg in history:
                sender = msg.get('sender', 'user')
                text = msg.get('text', '')
                prompt += f"{sender.capitalize()}: {text}\n"
        prompt += f"User: {message}"
        if db_context:
            prompt += f"\n\nContext: {str(db_context)}"
        # Use Google's Gemini Pro model
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text.strip() if hasattr(response, 'text') else str(response)
    except Exception as e:
        print(f"Google AI error: {e}")
        return "Sorry, I'm having trouble connecting to the AI service right now. Please try again later." 