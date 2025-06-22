from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

class JobDescription:
    @staticmethod
    def create(title, description, skills, user_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO job_descriptions (title, description, skills, user_id)
                    VALUES (%s, %s, %s, %s) RETURNING id;
                    """,
                    (title, description, skills, user_id)
                )
                jd_id = cursor.fetchone()[0]
                conn.commit()
                return jd_id

    @staticmethod
    def get_by_id(jd_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM job_descriptions WHERE id = %s;", (jd_id,))
                return cursor.fetchone()

    @staticmethod
    def get_all():
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC;")
                return cursor.fetchall()

    @staticmethod
    def get_by_user(user_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM job_descriptions WHERE user_id = %s ORDER BY created_at DESC;", (user_id,))
                return cursor.fetchall()

    @staticmethod
    def update(jd_id, title, description, skills):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE job_descriptions
                    SET title = %s, description = %s, skills = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (title, description, skills, jd_id)
                )
                conn.commit()

    @staticmethod
    def delete(jd_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM job_descriptions WHERE id = %s;", (jd_id,))
                conn.commit()