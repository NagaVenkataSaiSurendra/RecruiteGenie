from typing import Optional
from datetime import datetime
from backend.database import get_db_connection
import json

class MatchingResult:
    def __init__(self, job_id: int, consultant_id: int, score: float, 
                 status: str = "pending", notes: Optional[str] = None):
        self.job_id = job_id
        self.consultant_id = consultant_id
        self.score = score
        self.status = status
        self.notes = notes

    @staticmethod
    def create(job_description_id, status='PENDING'):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO matching_results (job_description_id, status)
                    VALUES (%s, %s) RETURNING id;
                    """,
                    (job_description_id, status)
                )
                result_id = cursor.fetchone()[0]
                conn.commit()
                return result_id

    @staticmethod
    def get_by_id(result_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM matching_results WHERE id = %s;",
                    (result_id,)
                )
                return cursor.fetchone()

    @staticmethod
    def get_by_job_description_id(job_description_id):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM matching_results WHERE job_description_id = %s ORDER BY created_at DESC;",
                    (job_description_id,)
                )
                return cursor.fetchall()

    @staticmethod
    def update_status(result_id, status):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE matching_results SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                    (status, result_id)
                )
                conn.commit()

    @staticmethod
    def update_results(result_id, results, status='COMPLETED'):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE matching_results
                    SET results = %s, status = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s;
                    """,
                    (json.dumps(results), status, result_id)
                )
                conn.commit()