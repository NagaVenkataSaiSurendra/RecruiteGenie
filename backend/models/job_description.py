from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

class JobDescription:
    @staticmethod
    def create(title, description, skills, user_id, document_path=None):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO job_descriptions (title, description, skills, user_id, document_path)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id;
                    """,
                    (title, description, skills, user_id, document_path)
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
    def update(jd_id, title, description, skills, document_path=None):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE job_descriptions
                    SET title = %s, description = %s, skills = %s, document_path = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (title, description, skills, document_path, jd_id)
                )
                conn.commit()

    @staticmethod
    def delete(jd_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM job_descriptions WHERE id = %s;", (jd_id,))
                conn.commit()

class JobUpload:
    @staticmethod
    def create(user_id, user_email, document_name):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO job_uploads (user_id, user_email, document_name, created_at)
                    VALUES (%s, %s, %s, NOW()) RETURNING id;
                    """,
                    (user_id, user_email, document_name)
                )
                upload_id = cursor.fetchone()[0]
                conn.commit()
                return upload_id