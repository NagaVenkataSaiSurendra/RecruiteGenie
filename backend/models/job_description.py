from typing import List, Optional
from datetime import datetime
from ..database import execute_query

class JobDescription:
    def __init__(self, title: str, department: str, description: str, skills: List[str], 
                 experience_required: int, created_by: int):
        self.title = title
        self.department = department
        self.description = description
        self.skills = skills
        self.experience_required = experience_required
        self.created_by = created_by

    @staticmethod
    def create(title: str, department: str, description: str, skills: List[str], 
              experience_required: int, created_by: int) -> int:
        query = """
            INSERT INTO job_descriptions (title, department, description, skills, experience_required, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        result = execute_query(query, (title, department, description, skills, experience_required, created_by))
        return result[0][0] if result else None

    @staticmethod
    def get_by_id(job_id: int):
        query = "SELECT * FROM job_descriptions WHERE id = %s"
        result = execute_query(query, (job_id,))
        if result:
            return JobDescription(
                title=result[0][1],
                department=result[0][2],
                description=result[0][3],
                skills=result[0][4],
                experience_required=result[0][5],
                created_by=result[0][6]
            )
        return None

    @staticmethod
    def get_all():
        query = "SELECT * FROM job_descriptions"
        results = execute_query(query)
        return [JobDescription(
            title=row[1],
            department=row[2],
            description=row[3],
            skills=row[4],
            experience_required=row[5],
            created_by=row[6]
        ) for row in results]

    def update(self, job_id: int):
        query = """
            UPDATE job_descriptions 
            SET title = %s, department = %s, description = %s, 
                skills = %s, experience_required = %s
            WHERE id = %s
        """
        execute_query(query, (
            self.title, self.department, self.description,
            self.skills, self.experience_required, job_id
        ), fetch=False)

    @staticmethod
    def delete(job_id: int):
        query = "DELETE FROM job_descriptions WHERE id = %s"
        execute_query(query, (job_id,), fetch=False)