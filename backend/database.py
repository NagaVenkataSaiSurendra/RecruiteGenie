import psycopg2
import logging
from contextlib import contextmanager
from config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = psycopg2.connect(
            dbname=settings.database_name,
            user=settings.database_user,
            password=settings.database_password,
            host=settings.database_host,
            port=settings.database_port
        )
        logger.info("Opened new DB connection.")
        yield conn
    except Exception as e:
        logger.error(f"Error getting DB connection: {e}")
        raise
    finally:
        if conn:
            conn.close()
            logger.info("Closed DB connection.")

def ensure_database_exists():
    # This step must use a direct connection to the maintenance DB
    try:
        logger.info("Checking if database exists...")
        conn = psycopg2.connect(
            dbname="postgres",
            user=settings.database_user,
            password=settings.database_password,
            host=settings.database_host,
            port=settings.database_port
        )
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (settings.database_name,))
        if not cursor.fetchone():
            cursor.execute(f"CREATE DATABASE {settings.database_name}")
            logger.info(f"Database '{settings.database_name}' created.")
        else:
            logger.info(f"Database '{settings.database_name}' already exists.")
        cursor.close()
        conn.close()
    except Exception as e:
        logger.error(f"Could not ensure database exists: {e}")
        pass

def ensure_tables_exist():
    logger.info("Ensuring all tables exist...")
    commands = [
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL CHECK (role IN ('recruiter', 'ar_requestor')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS ar_requestors (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS job_descriptions (
                id SERIAL PRIMARY KEY,
                ar_requestor_id INTEGER REFERENCES ar_requestors(id),
                department VARCHAR(255),
                job_title VARCHAR(255),
                skills TEXT,
                experience_required INTEGER,
                job_description TEXT,
                document_path VARCHAR(512),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS consultant_profiles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                experience INTEGER NOT NULL, -- in years
                skills TEXT, -- Comma-separated skills
                education VARCHAR(255),
                role VARCHAR(255),
                profile_summary TEXT,
                document_path VARCHAR(512),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS matching_results (
                id SERIAL PRIMARY KEY,
                job_description_id INTEGER REFERENCES job_descriptions(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, FAILED
                results JSONB, -- {'top_matches': [{'consultant_id': X, 'score': Y}, ...]}
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS consultants_profile_data (
                id SERIAL PRIMARY KEY,
                recruiter_id INTEGER NOT NULL,
                recruiter_email VARCHAR(255) NOT NULL,
                document_path VARCHAR(512) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS profile_matches (
                id SERIAL PRIMARY KEY,
                ar_requestor_id INTEGER REFERENCES ar_requestors(id),
                recruiter_id INTEGER REFERENCES users(id),
                profile_id INTEGER REFERENCES consultant_profiles(id),
                candidate_name VARCHAR(255),
                llm_score FLOAT,
                llm_reasoning TEXT,
                job_description_id INTEGER REFERENCES job_descriptions(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """
        ]
 

    alter_commands = [
            "ALTER TABLE consultant_profiles ADD COLUMN education VARCHAR(255);",
            "ALTER TABLE consultant_profiles ADD COLUMN role VARCHAR(255);",
            "ALTER TABLE consultant_profiles ADD COLUMN recruiter_id INTEGER;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);",
            "ALTER TABLE job_descriptions DROP COLUMN IF EXISTS title;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS skills TEXT;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS experience_required INTEGER;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS job_description TEXT;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS ar_requestor_id INTEGER REFERENCES ar_requestors(id);",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS department VARCHAR(255);"
        ]
    with get_db_connection() as conn:
        cursor = conn.cursor()
        for command in commands:
            try:
                logger.info(f"Executing table creation: {command.split('(')[0].strip()}")
                cursor.execute("BEGIN;")
                cursor.execute(command)
                cursor.execute("COMMIT;")
                logger.info("Table creation command executed successfully.")
            except Exception as e:
                conn.rollback()
                logger.warning(f'Could not execute command: {e}\nSQL: {command}')
        for command in alter_commands:
            try:
                logger.info(f"Executing alter command: {command}")
                cursor.execute("BEGIN;")
                cursor.execute(command)
                cursor.execute("COMMIT;")
                logger.info("Alter command executed successfully.")
            except Exception as e:
                conn.rollback()
                if 'already exists' in str(e):
                    logger.info(f"Column already exists, skipping: {command}")
                else:
                    logger.warning(f'Could not alter table: {e}\nSQL: {command}')
        conn.commit()
        cursor.close()
    logger.info("All tables ensured.")

def setup_database():
    ensure_database_exists()
    ensure_tables_exist()

# Example usage:
# with get_db_connection() as conn:
#     with conn.cursor() as cursor:
#         cursor.execute("SELECT version();")
#         db_version = cursor.fetchone()
#         logger.info(f"PostgreSQL version: {db_version}")