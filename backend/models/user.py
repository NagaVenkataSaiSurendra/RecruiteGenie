from typing import Optional
from datetime import datetime
from backend.database import get_db_connection
import logging
from psycopg2.extras import RealDictCursor

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class User:
    @staticmethod
    def create(full_name, email, hashed_password, role):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO users (full_name, email, hashed_password, role)
                    VALUES (%s, %s, %s, %s) RETURNING id;
                    """,
                    (full_name, email, hashed_password, role)
                )
                user_id = cursor.fetchone()[0]
                conn.commit()
                return user_id

    @staticmethod
    def get_by_email(email):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM users WHERE email = %s;", (email,))
                return cursor.fetchone()

    @staticmethod
    def get_by_id(user_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
                return cursor.fetchone()

    @staticmethod
    def update(user_id, full_name, email, hashed_password, role):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE users SET full_name = %s, email = %s, hashed_password = %s, role = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (full_name, email, hashed_password, role, user_id)
                )
                conn.commit()

    @staticmethod
    def delete(user_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM users WHERE id = %s;", (user_id,))
                conn.commit()

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