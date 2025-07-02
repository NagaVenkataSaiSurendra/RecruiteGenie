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
                fullName VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL CHECK (role IN ('recruiter', 'ar_requestor')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS job_descriptions (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                skills TEXT, -- Comma-separated skills
                user_id INTEGER REFERENCES users(id),
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
            """
        ]

        for command in commands:
            cursor.execute(command)

        # Ensure columns exist in consultant_profiles (ignore errors if already exist)
        alter_commands = [
            "ALTER TABLE consultant_profiles ADD COLUMN education VARCHAR(255);",
            "ALTER TABLE consultant_profiles ADD COLUMN role VARCHAR(255);",
            "ALTER TABLE consultant_profiles ADD COLUMN recruiter_id INTEGER;"
        ]
        for command in alter_commands:
            try:
                cursor.execute(command)
            except Exception as e:
                if 'already exists' in str(e):
                    logger.info(f"Column already exists, skipping: {command}")
                else:
                    logger.warning(f'Could not alter consultant_profiles: {e}')

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