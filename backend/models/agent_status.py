from typing import Optional
from datetime import datetime
from backend.database import get_db_connection
from psycopg2.extras import RealDictCursor

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
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO agent_status (agent_id, status, last_active, current_task, notes)
                    VALUES (%s, %s, %s, %s, %s) RETURNING id;
                    """,
                    (agent_id, status, last_active, current_task, notes)
                )
                status_id = cursor.fetchone()[0]
                conn.commit()
                return status_id

    @staticmethod
    def get_by_id(status_id: int):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM agent_status WHERE id = %s;", (status_id,))
                result = cursor.fetchone()
                if result:
                    return AgentStatus(
                        agent_id=result['agent_id'],
                        status=result['status'],
                        last_active=result['last_active'],
                        current_task=result['current_task'],
                        notes=result['notes']
                    )
                return None

    @staticmethod
    def get_by_agent_id(agent_id: int):
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM agent_status WHERE agent_id = %s ORDER BY last_active DESC LIMIT 1;", (agent_id,))
                result = cursor.fetchone()
                if result:
                    return AgentStatus(
                        agent_id=result['agent_id'],
                        status=result['status'],
                        last_active=result['last_active'],
                        current_task=result['current_task'],
                        notes=result['notes']
                    )
                return None

    @staticmethod
    def get_all_active():
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT * FROM agent_status WHERE status = 'active' ORDER BY last_active DESC;")
                results = cursor.fetchall()
                return [AgentStatus(
                    agent_id=row['agent_id'],
                    status=row['status'],
                    last_active=row['last_active'],
                    current_task=row['current_task'],
                    notes=row['notes']
                ) for row in results]

    def update(self, status_id: int):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE agent_status
                    SET status = %s, last_active = %s, current_task = %s, notes = %s
                    WHERE id = %s;
                    """,
                    (self.status, self.last_active, self.current_task, self.notes, status_id)
                )
                conn.commit()

    @staticmethod
    def delete(status_id: int):
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM agent_status WHERE id = %s;", (status_id,))
                conn.commit()