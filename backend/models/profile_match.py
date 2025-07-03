from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

class ProfileMatch:
    @staticmethod
    def create(ar_requestor_id, recruiter_id, profile_id, candidate_name, llm_score, llm_reasoning, job_description_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    '''
                    INSERT INTO profile_matches
                    (ar_requestor_id, recruiter_id, profile_id, candidate_name, llm_score, llm_reasoning, job_description_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id;
                    ''',
                    (ar_requestor_id, recruiter_id, profile_id, candidate_name, llm_score, llm_reasoning, job_description_id)
                )
                match_id = cursor.fetchone()[0]
                conn.commit()
                return match_id

    @staticmethod
    def get_by_job_description_id(job_description_id):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    'SELECT * FROM profile_matches WHERE job_description_id = %s ORDER BY llm_score DESC;',
                    (job_description_id,)
                )
                return cursor.fetchall() 