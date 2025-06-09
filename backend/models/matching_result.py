from typing import Optional
from datetime import datetime
from ..database import execute_query

class MatchingResult:
    def __init__(self, job_id: int, consultant_id: int, score: float, 
                 status: str = "pending", notes: Optional[str] = None):
        self.job_id = job_id
        self.consultant_id = consultant_id
        self.score = score
        self.status = status
        self.notes = notes

    @staticmethod
    def create(job_id: int, consultant_id: int, score: float, 
              status: str = "pending", notes: Optional[str] = None) -> int:
        query = """
            INSERT INTO matching_results (job_id, consultant_id, score, status, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        result = execute_query(query, (job_id, consultant_id, score, status, notes))
        return result[0][0] if result else None

    @staticmethod
    def get_by_id(match_id: int):
        query = "SELECT * FROM matching_results WHERE id = %s"
        result = execute_query(query, (match_id,))
        if result:
            return MatchingResult(
                job_id=result[0][1],
                consultant_id=result[0][2],
                score=result[0][3],
                status=result[0][4],
                notes=result[0][5]
            )
        return None

    @staticmethod
    def get_by_job_id(job_id: int):
        query = "SELECT * FROM matching_results WHERE job_id = %s"
        results = execute_query(query, (job_id,))
        return [MatchingResult(
            job_id=row[1],
            consultant_id=row[2],
            score=row[3],
            status=row[4],
            notes=row[5]
        ) for row in results]

    @staticmethod
    def get_by_consultant_id(consultant_id: int):
        query = "SELECT * FROM matching_results WHERE consultant_id = %s"
        results = execute_query(query, (consultant_id,))
        return [MatchingResult(
            job_id=row[1],
            consultant_id=row[2],
            score=row[3],
            status=row[4],
            notes=row[5]
        ) for row in results]

    def update(self, match_id: int):
        query = """
            UPDATE matching_results 
            SET score = %s, status = %s, notes = %s
            WHERE id = %s
        """
        execute_query(query, (self.score, self.status, self.notes, match_id), fetch=False)

    @staticmethod
    def delete(match_id: int):
        query = "DELETE FROM matching_results WHERE id = %s"
        execute_query(query, (match_id,), fetch=False)