from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from backend.models.user import User
from backend.schemas.user import UserCreate
from backend.config import get_settings
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
settings = get_settings()
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Error verifying password: {str(e)}")
            return False

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Generate password hash"""
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Error hashing password: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing password"
            )

    @staticmethod
    def authenticate_user(email: str, password: str) -> Optional[dict]:
        """Authenticate a user and return user dict if valid, else None"""
        try:
            logger.info(f"Looking up user by email: {email}")
            user = User.get_by_email(email)
            if not user:
                logger.warning(f"No user found with email: {email}")
                return None
            # user is a dict from RealDictCursor
            if not AuthService.verify_password(password, user['hashed_password']):
                logger.warning(f"Invalid password for user: {email}")
                return None
            return user
        except Exception as e:
            logger.error(f"Error authenticating user: {str(e)}")
            return None

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creating access token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error creating access token"
            )

    @staticmethod
    def create_user(email: str, password: str, full_name: str, role: str = "recruiter") -> Optional[User]:
        """Create a new user"""
        try:
            logger.info(f"Creating new user with email: {email}")
            # Check if user already exists
            existing_user = User.get_by_email(email)
            if existing_user:
                logger.warning(f"User already exists with email: {email}")
                return None

            # Create user
            hashed_password = AuthService.get_password_hash(password)
            user_id = User.create(
                fullName=full_name,
                email=email,
                hashed_password=hashed_password,
                role=role
            )

            if not user_id:
                logger.error("Failed to create user - no ID returned")
                return None

            # Get the created user
            user = User.get_by_id(user_id)
            if not user:
                logger.error(f"Failed to retrieve created user with ID: {user_id}")
                return None

            logger.info(f"Successfully created user with ID: {user_id}")
            return user
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return None

    @staticmethod
    async def get_current_user(request: Request) -> dict:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise credentials_exception
            token = auth_header.split(" ", 1)[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise credentials_exception
        except JWTError as e:
            logger.error(f"JWT decode error: {str(e)}")
            raise credentials_exception

        user = User.get_by_id(int(user_id))
        if user is None:
            logger.error(f"No user found with ID: {user_id}")
            raise credentials_exception
        return user

    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        try:
            logger.info(f"Looking up user by email: {email}")
            return User.get_by_email(email)
        except Exception as e:
            logger.error(f"Error getting user by email: {str(e)}")
            return None

# Create auth service instance
auth_service = AuthService()