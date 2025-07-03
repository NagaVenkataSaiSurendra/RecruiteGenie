import os
import sys
import psycopg2
from psycopg2 import pool
import logging

# Add the project root to the Python path
# This allows the script to be run from the 'backend' directory or the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    settings = get_settings()
    
    # Connect to the maintenance database to create the main database
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=settings.database_user,
            password=settings.database_password,
            host=settings.database_host,
            port=settings.database_port
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if the database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (settings.database_name,))
        if not cursor.fetchone():
            cursor.execute(f"CREATE DATABASE {settings.database_name}")
            logger.info(f"Database '{settings.database_name}' created.")
        else:
            logger.info(f"Database '{settings.database_name}' already exists.")
            
        cursor.close()
        conn.close()
    except psycopg2.OperationalError as e:
        logger.error(f"Could not connect to postgres database: {e}")
        # If DB doesn't exist, we can't continue, but maybe it will be created and we can connect later.
        # For now, we assume it exists for the next step.
        pass
    except Exception as e:
        logger.error(f"An error occurred during database existence check: {e}")
        return

    # Now, connect to the actual project database
    try:
        db_url = f"dbname='{settings.database_name}' user='{settings.database_user}' password='{settings.database_password}' host='{settings.database_host}' port='{settings.database_port}'"
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
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

        logger.info("All table creation commands to be executed:")
        for c in commands:
            logger.info(f"Executing table creation: {c.strip()}")
            try:
                cursor.execute(c)
                logger.info("Table creation command executed successfully.")
            except Exception as e:
                logger.error(f"Error executing table creation command: {e}\nSQL: {c.strip()}")

        # Ensure columns exist in consultant_profiles (ignore errors if already exist)
        alter_commands = [
            "ALTER TABLE consultant_profiles ADD COLUMN education VARCHAR(255);",
            "ALTER TABLE consultant_profiles ADD COLUMN role VARCHAR(255);",
            "ALTER TABLE consultant_profiles ADD COLUMN recruiter_id INTEGER;",
            "ALTER TABLE job_descriptions DROP COLUMN IF EXISTS job_title;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS title VARCHAR(255);",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS skills TEXT;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS experience_required INTEGER;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS job_description TEXT;",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS ar_requestor_id INTEGER REFERENCES ar_requestors(id);",
            "ALTER TABLE job_descriptions ADD COLUMN IF NOT EXISTS department VARCHAR(255);"
        ]
        # Run each ALTER TABLE command in its own transaction
        for command in alter_commands:
            try:
                logger.info(f"Executing alter command: {command}")
                cursor.execute("BEGIN;")
                try:
                    cursor.execute(command)
                except Exception as e:
                    # Fallback for ADD COLUMN IF NOT EXISTS not supported
                    if 'job_title' in command and 'already exists' not in str(e):
                        try:
                            cursor.execute("ALTER TABLE job_descriptions ADD COLUMN job_title VARCHAR(255);")
                            logger.info("Fallback: Added job_title column without IF NOT EXISTS.")
                        except Exception as inner_e:
                            if 'already exists' in str(inner_e):
                                logger.info("Column job_title already exists, skipping fallback.")
                            else:
                                logger.warning(f'Could not alter table (fallback): {inner_e}\nSQL: ALTER TABLE job_descriptions ADD COLUMN job_title VARCHAR(255);')
                    else:
                        raise
                logger.info(f"Executed: {command}")
                cursor.execute("COMMIT;")
            except Exception as e:
                conn.rollback()
                if 'already exists' in str(e):
                    logger.info(f"Column already exists, skipping: {command}")
                else:
                    logger.warning(f'Could not alter table: {e}\nSQL: {command}')

        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Database tables created successfully.")

    except psycopg2.OperationalError as e:
        logger.error(f"Error connecting to the database or creating tables: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    init_db()