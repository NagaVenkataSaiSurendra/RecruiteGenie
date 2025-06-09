from typing import List, Optional
from datetime import datetime
from ..database import execute_query

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
    def create(name: str, email: str, skills: List[str], experience: int,
              bio: str, availability: str = "available", rating: float = 0.0) -> int:
        query = """
            INSERT INTO consultant_profiles (name, email, skills, experience, bio, availability, rating)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        result = execute_query(query, (name, email, skills, experience, bio, availability, rating))
        return result[0][0] if result else None

    @staticmethod
    def get_by_id(profile_id: int):
        query = "SELECT * FROM consultant_profiles WHERE id = %s"
        result = execute_query(query, (profile_id,))
        if result:
            return ConsultantProfile(
                name=result[0][1],
                email=result[0][2],
                skills=result[0][3],
                experience=result[0][4],
                bio=result[0][5],
                availability=result[0][6],
                rating=result[0][7]
            )
        return None

    @staticmethod
    def get_by_email(email: str):
        query = "SELECT * FROM consultant_profiles WHERE email = %s"
        result = execute_query(query, (email,))
        if result:
            return ConsultantProfile(
                name=result[0][1],
                email=result[0][2],
                skills=result[0][3],
                experience=result[0][4],
                bio=result[0][5],
                availability=result[0][6],
                rating=result[0][7]
            )
        return None

    @staticmethod
    def get_all():
        query = "SELECT * FROM consultant_profiles"
        results = execute_query(query)
        return [ConsultantProfile(
            name=row[1],
            email=row[2],
            skills=row[3],
            experience=row[4],
            bio=row[5],
            availability=row[6],
            rating=row[7]
        ) for row in results]

    def update(self, profile_id: int):
        query = """
            UPDATE consultant_profiles 
            SET name = %s, email = %s, skills = %s, experience = %s,
                bio = %s, availability = %s, rating = %s
            WHERE id = %s
        """
        execute_query(query, (
            self.name, self.email, self.skills, self.experience,
            self.bio, self.availability, self.rating, profile_id
        ), fetch=False)

    @staticmethod
    def delete(profile_id: int):
        query = "DELETE FROM consultant_profiles WHERE id = %s"
        execute_query(query, (profile_id,), fetch=False)