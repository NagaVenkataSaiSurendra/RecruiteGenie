import psycopg2
from psycopg2 import pool
import logging
from contextlib import contextmanager
from config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Create a connection pool
try:
    db_pool = psycopg2.pool.SimpleConnectionPool(
        1,  # minconn
        20, # maxconn
        user=settings.database_user,
        password=settings.database_password,
        host=settings.database_host,
        port=settings.database_port,
        dbname=settings.database_name
    )
    if db_pool:
        logger.info("Database connection pool created successfully.")
except psycopg2.OperationalError as e:
    logger.error(f"Failed to create database connection pool: {e}")
    db_pool = None

@contextmanager
def get_db_connection():
    """
    Get a connection from the pool.
    This is a context manager, so it will handle closing the connection.
    """
    if db_pool is None:
        raise ConnectionError("Database connection pool is not available.")
    
    conn = None
    try:
        conn = db_pool.getconn()
        yield conn
    except Exception as e:
        logger.error(f"Error getting connection from pool: {e}")
        raise
    finally:
        if conn:
            db_pool.putconn(conn)

def close_db_pool():
    """Close all connections in the pool."""
    if db_pool:
        db_pool.closeall()
        logger.info("Database connection pool closed.")

# Example usage:
# with get_db_connection() as conn:
#     with conn.cursor() as cursor:
#         cursor.execute("SELECT version();")
#         db_version = cursor.fetchone()
#         logger.info(f"PostgreSQL version: {db_version}")