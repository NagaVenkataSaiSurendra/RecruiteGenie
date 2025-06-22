from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

# Note: Create a .env file in the 'backend' directory with the following content:
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USER=user
# DATABASE_PASSWORD=password
# DATABASE_NAME=recruitment
# SECRET_KEY=your_secret_key
# ALGORITHM=HS256
# ACCESS_TOKEN_EXPIRE_MINUTES=30

# Load environment variables from .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

class Settings(BaseSettings):
    database_host: str = os.getenv("DATABASE_HOST", "localhost")
    database_port: int = int(os.getenv("DATABASE_PORT", 5433))
    database_user: str = os.getenv("DATABASE_USER", "postgres")
    database_password: str = os.getenv("DATABASE_PASSWORD", "Password@123")
    database_name: str = os.getenv("DATABASE_NAME", "samplee_db")
    
    secret_key: str = os.getenv("SECRET_KEY", "a_very_secret_key")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # Azure OpenAI Configuration
    azure_openai_api_key: str = os.getenv("AZURE_OPENAI_API_KEY", "")
    azure_openai_endpoint: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    azure_openai_api_version: str = os.getenv("AZURE_OPENAI_API_VERSION", "2023-12-01-preview")
    azure_openai_deployment_name: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "")

    # SMTP/Email Configuration
    smtp_server: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", 587))
    email_username: str = os.getenv("EMAIL_USERNAME", "")
    email_password: str = os.getenv("EMAIL_PASSWORD", "")

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

def get_settings():
    return Settings()