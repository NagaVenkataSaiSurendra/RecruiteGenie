from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

class JobDescription:
    @staticmethod
    def create(ar_requestor_id, department, job_title, skills, experience_required, job_description, document_path=None):
        # Store skills as comma-separated string
        if isinstance(skills, list):
            skills_str = ','.join(skills)
        else:
            skills_str = skills or ''
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO job_descriptions (ar_requestor_id, department, job_title, skills, experience_required, job_description, document_path)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id;
                    """,
                    (ar_requestor_id, department, job_title, skills_str, experience_required, job_description, document_path)
                )
                jd_id = cursor.fetchone()[0]
                conn.commit()
                return jd_id

    @staticmethod
    def get_by_id(jd_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM job_descriptions WHERE id = %s;", (jd_id,))
                job = cursor.fetchone()
                if job and 'skills' in job and isinstance(job['skills'], str):
                    job['skills'] = [s.strip() for s in job['skills'].split(',') if s.strip()]
                return job

    @staticmethod
    def get_all():
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM job_descriptions ORDER BY created_at DESC;")
                jobs = cursor.fetchall()
                for job in jobs:
                    if job and 'skills' in job and isinstance(job['skills'], str):
                        job['skills'] = [s.strip() for s in job['skills'].split(',') if s.strip()]
                return jobs

    @staticmethod
    def get_by_user(user_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM job_descriptions WHERE user_id = %s ORDER BY created_at DESC;", (user_id,))
                return cursor.fetchall()

    @staticmethod
    def update(jd_id, title, description, skills, document_path=None, department=None, experience_required=None):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE job_descriptions
                    SET title = %s, description = %s, skills = %s, document_path = %s, department = %s, experience_required = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (title, description, skills, document_path, department, experience_required, jd_id)
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