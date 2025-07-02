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
    def create(name, email, experience, skills, profile_summary, document_path=None):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO consultant_profiles (name, email, experience, skills, profile_summary, document_path)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
                    """,
                    (name, email, experience, skills, profile_summary, document_path)
                )
                profile_id = cursor.fetchone()[0]
                conn.commit()
                return profile_id

    @staticmethod
    def get_by_id(profile_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM consultant_profiles WHERE id = %s;", (profile_id,))
                row = cursor.fetchone()
                if row:
                    return _format_consultant_row(row)
                return None

    @staticmethod
    def get_all():
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM consultant_profiles ORDER BY name;")
                rows = cursor.fetchall()
                return [_format_consultant_row(row) for row in rows]

    @staticmethod
    def update(profile_id, name, email, experience, skills, profile_summary, document_path=None):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE consultant_profiles
                    SET name = %s, email = %s, experience = %s, skills = %s, profile_summary = %s, document_path = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (name, email, experience, skills, profile_summary, document_path, profile_id)
                )
                conn.commit()

    @staticmethod
    def delete(profile_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM consultant_profiles WHERE id = %s;", (profile_id,))
                conn.commit()

    @staticmethod
    def create_from_parsed(profile: dict, recruiter_id: int, document_path: str):
        # Skip profiles without an email
        if not profile.get('email'):
            return None
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO consultant_profiles (name, email, skills, education, experience, recruiter_id, document_path)
                        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id;
                        """,
                        (
                            profile.get('name'),
                            profile.get('email'),
                            profile.get('skills'),
                            profile.get('education'),
                            profile.get('years_of_experience'),
                            recruiter_id,
                            document_path
                        )
                    )
                    new_id = cursor.fetchone()[0]
                    conn.commit()
                    return new_id
        except Exception as e:
            if 'duplicate key value violates unique constraint' in str(e):
                # Skip duplicate emails
                return None
            else:
                raise

class ConsultantUpload:
    @staticmethod
    def create(user_id, user_email, document_name):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO consultant (user_id, user_email, document_name, created_at)
                    VALUES (%s, %s, %s, NOW()) RETURNING id;
                    """,
                    (user_id, user_email, document_name)
                )
                upload_id = cursor.fetchone()[0]
                conn.commit()
                return upload_id

def _format_consultant_row(row):
    # Ensure skills is a list
    skills = row.get('skills')
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(',') if s.strip()]
    elif not isinstance(skills, list):
        skills = []
    # Ensure rating is present
    rating = row.get('rating', 0.0)
    row['skills'] = skills
    row['rating'] = rating
    return row