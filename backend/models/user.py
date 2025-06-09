from typing import Optional
from datetime import datetime
from ..database import get_db_connection, release_db_connection
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class User:
    def __init__(self, id: int, email: str, hashed_password: str, full_name: str, is_active: bool = True):
        self.id = id
        self.email = email
        self.hashed_password = hashed_password
        self.full_name = full_name
        self.is_active = is_active
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    @staticmethod
    def create(email: str, hashed_password: str, full_name: str, is_active: bool = True) -> Optional[int]:
        """Create a new user"""
        try:
            logger.info(f"Creating user with email: {email}")
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO users (email, hashed_password, full_name, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (email, hashed_password, full_name, is_active, datetime.utcnow(), datetime.utcnow()))
                    user_id = cur.fetchone()[0]
                    conn.commit()
                    logger.info(f"Successfully created user with ID: {user_id}")
                    return user_id
            except Exception as e:
                conn.rollback()
                logger.error(f"Error creating user: {str(e)}")
                raise
            finally:
                release_db_connection(conn)
        except Exception as e:
            logger.error(f"Database error creating user: {str(e)}")
            return None

    @staticmethod
    def get_by_id(user_id: int) -> Optional['User']:
        """Get user by ID"""
        try:
            logger.info(f"Looking up user by ID: {user_id}")
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, email, hashed_password, full_name, is_active, created_at, updated_at
                        FROM users
                        WHERE id = %s
                    """, (user_id,))
                    result = cur.fetchone()
                    if result:
                        user = User(
                            id=result[0],
                            email=result[1],
                            hashed_password=result[2],
                            full_name=result[3],
                            is_active=result[4]
                        )
                        user.created_at = result[5]
                        user.updated_at = result[6]
                        return user
                    logger.warning(f"No user found with ID: {user_id}")
                    return None
            finally:
                release_db_connection(conn)
        except Exception as e:
            logger.error(f"Error retrieving user by ID: {str(e)}")
            return None

    @staticmethod
    def get_by_email(email: str) -> Optional['User']:
        """Get user by email"""
        try:
            logger.info(f"Looking up user by email: {email}")
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, email, hashed_password, full_name, is_active, created_at, updated_at
                        FROM users
                        WHERE email = %s
                    """, (email,))
                    result = cur.fetchone()
                    if result:
                        user = User(
                            id=result[0],
                            email=result[1],
                            hashed_password=result[2],
                            full_name=result[3],
                            is_active=result[4]
                        )
                        user.created_at = result[5]
                        user.updated_at = result[6]
                        return user
                    logger.warning(f"No user found with email: {email}")
                    return None
            finally:
                release_db_connection(conn)
        except Exception as e:
            logger.error(f"Error retrieving user by email: {str(e)}")
            return None

    def update(self, user_id: int) -> bool:
        """Update user information"""
        try:
            logger.info(f"Updating user with ID: {user_id}")
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE users
                        SET email = %s, hashed_password = %s, full_name = %s, is_active = %s, updated_at = %s
                        WHERE id = %s
                    """, (self.email, self.hashed_password, self.full_name, self.is_active, datetime.utcnow(), user_id))
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                logger.error(f"Error updating user: {str(e)}")
                raise
            finally:
                release_db_connection(conn)
        except Exception as e:
            logger.error(f"Database error updating user: {str(e)}")
            return False

    @staticmethod
    def delete(user_id: int) -> bool:
        """Delete a user"""
        try:
            logger.info(f"Deleting user with ID: {user_id}")
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                logger.error(f"Error deleting user: {str(e)}")
                raise
            finally:
                release_db_connection(conn)
        except Exception as e:
            logger.error(f"Database error deleting user: {str(e)}")
            return False

    def to_dict(self) -> dict:
        """Convert user object to dictionary"""
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }