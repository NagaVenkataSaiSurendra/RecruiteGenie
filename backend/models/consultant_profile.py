from typing import List, Optional
from datetime import datetime
from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

class ConsultantProfile:
    def __init__(self, name: str, email: str, skills: List[str], experience: int,
                 bio: str, availability: str = "available", rating: float = 0.0):
        self.name = name
        self.email = email
        self.skills = skills
        self.experience = experience
        self.bio = bio
        self.availability = availability
        self.rating = rating

    @staticmethod
    def create(name, email, experience, skills, profile_summary):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO consultant_profiles (name, email, experience, skills, profile_summary)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id;
                    """,
                    (name, email, experience, skills, profile_summary)
                )
                profile_id = cursor.fetchone()[0]
                conn.commit()
                return profile_id

    @staticmethod
    def get_by_id(profile_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM consultant_profiles WHERE id = %s;", (profile_id,))
                return cursor.fetchone()

    @staticmethod
    def get_all():
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM consultant_profiles ORDER BY name;")
                return cursor.fetchall()

    @staticmethod
    def update(profile_id, name, email, experience, skills, profile_summary):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE consultant_profiles
                    SET name = %s, email = %s, experience = %s, skills = %s, profile_summary = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (name, email, experience, skills, profile_summary, profile_id)
                )
                conn.commit()

    @staticmethod
    def delete(profile_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM consultant_profiles WHERE id = %s;", (profile_id,))
                conn.commit()