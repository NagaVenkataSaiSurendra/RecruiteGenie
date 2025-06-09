from typing import Optional
from datetime import datetime
from ..database import execute_query

class AgentStatus:
    def __init__(self, agent_id: int, status: str, last_active: datetime,
                 current_task: Optional[str] = None, notes: Optional[str] = None):
        self.agent_id = agent_id
        self.status = status
        self.last_active = last_active
        self.current_task = current_task
        self.notes = notes

    @staticmethod
    def create(agent_id: int, status: str, last_active: datetime,
              current_task: Optional[str] = None, notes: Optional[str] = None) -> int:
        query = """
            INSERT INTO agent_status (agent_id, status, last_active, current_task, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        result = execute_query(query, (agent_id, status, last_active, current_task, notes))
        return result[0][0] if result else None

    @staticmethod
    def get_by_id(status_id: int):
        query = "SELECT * FROM agent_status WHERE id = %s"
        result = execute_query(query, (status_id,))
        if result:
            return AgentStatus(
                agent_id=result[0][1],
                status=result[0][2],
                last_active=result[0][3],
                current_task=result[0][4],
                notes=result[0][5]
            )
        return None

    @staticmethod
    def get_by_agent_id(agent_id: int):
        query = "SELECT * FROM agent_status WHERE agent_id = %s ORDER BY last_active DESC LIMIT 1"
        result = execute_query(query, (agent_id,))
        if result:
            return AgentStatus(
                agent_id=result[0][1],
                status=result[0][2],
                last_active=result[0][3],
                current_task=result[0][4],
                notes=result[0][5]
            )
        return None

    @staticmethod
    def get_all_active():
        query = "SELECT * FROM agent_status WHERE status = 'active' ORDER BY last_active DESC"
        results = execute_query(query)
        return [AgentStatus(
            agent_id=row[1],
            status=row[2],
            last_active=row[3],
            current_task=row[4],
            notes=row[5]
        ) for row in results]

    def update(self, status_id: int):
        query = """
            UPDATE agent_status 
            SET status = %s, last_active = %s, current_task = %s, notes = %s
            WHERE id = %s
        """
        execute_query(query, (
            self.status, self.last_active, self.current_task,
            self.notes, status_id
        ), fetch=False)

    @staticmethod
    def delete(status_id: int):
        query = "DELETE FROM agent_status WHERE id = %s"
        execute_query(query, (status_id,), fetch=False)