import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from .config import settings
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    """Initialize the database with required tables"""
    try:
        # Connect to PostgreSQL server
        conn = psycopg2.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        with conn.cursor() as cur:
            # Create database if it doesn't exist
            cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{settings.DB_NAME}'")
            if not cur.fetchone():
                logger.info(f"Creating database {settings.DB_NAME}")
                cur.execute(f"CREATE DATABASE {settings.DB_NAME}")
        
        conn.close()
        
        # Connect to the database
        conn = psycopg2.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            dbname=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD
        )
        
        with conn.cursor() as cur:
            # Drop existing tables if they exist
            logger.info("Dropping existing tables...")
            cur.execute("""
                DROP TABLE IF EXISTS matching_results CASCADE;
                DROP TABLE IF EXISTS consultant_profiles CASCADE;
                DROP TABLE IF EXISTS job_descriptions CASCADE;
                DROP TABLE IF EXISTS users CASCADE;
            """)
            
            # Create users table
            logger.info("Creating users table...")
            cur.execute("""
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(255),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create job_descriptions table
            logger.info("Creating job_descriptions table...")
            cur.execute("""
                CREATE TABLE job_descriptions (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    department VARCHAR(255),
                    description TEXT,
                    skills TEXT[],
                    experience_required INTEGER,
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create consultant_profiles table
            logger.info("Creating consultant_profiles table...")
            cur.execute("""
                CREATE TABLE consultant_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    skills TEXT[],
                    experience_years INTEGER,
                    hourly_rate DECIMAL(10,2),
                    availability VARCHAR(50),
                    bio TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create matching_results table
            logger.info("Creating matching_results table...")
            cur.execute("""
                CREATE TABLE matching_results (
                    id SERIAL PRIMARY KEY,
                    job_id INTEGER REFERENCES job_descriptions(id),
                    consultant_id INTEGER REFERENCES consultant_profiles(id),
                    score DECIMAL(5,2),
                    status VARCHAR(50),
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
            logger.info("Database tables created successfully")
            
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    init_db()