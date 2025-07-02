from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

class ConsultantsProfileData:
    @staticmethod
    def create(recruiter_id, recruiter_email, document_path):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO consultants_profile_data (recruiter_id, recruiter_email, document_path, created_at)
                    VALUES (%s, %s, %s, NOW()) RETURNING id;
                    """,
                    (recruiter_id, recruiter_email, document_path)
                )
                profile_id = cursor.fetchone()[0]
                conn.commit()
                return profile_id

    @staticmethod
    def get_by_id(profile_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM consultants_profile_data WHERE id = %s;", (profile_id,))
                return cursor.fetchone()

    @staticmethod
    def get_all():
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM consultants_profile_data ORDER BY created_at DESC;")
                return cursor.fetchall()

    @staticmethod
    def delete(profile_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM consultants_profile_data WHERE id = %s;", (profile_id,))
                conn.commit() 