import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
import logging
from .config import settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a connection pool
try:
    connection_pool = pool.SimpleConnectionPool(
        1,  # minconn
        10,  # maxconn
        host=settings.DB_HOST,
        database=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        port=settings.DB_PORT
    )
    logger.info("Successfully created database connection pool")
except Exception as e:
    logger.error(f"Error creating database connection pool: {str(e)}")
    raise

def get_db_connection():
    """Get a connection from the pool"""
    try:
        conn = connection_pool.getconn()
        logger.debug("Successfully got connection from pool")
        return conn
    except Exception as e:
        logger.error(f"Error getting connection from pool: {str(e)}")
        raise

def release_db_connection(conn):
    """Release a connection back to the pool"""
    try:
        connection_pool.putconn(conn)
        logger.debug("Successfully released connection back to pool")
    except Exception as e:
        logger.error(f"Error releasing connection back to pool: {str(e)}")
        raise

def execute_query(query, params=None, fetch=True):
    """Execute a query and return results if fetch is True"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            logger.debug(f"Executing query: {query}")
            logger.debug(f"With params: {params}")
            cursor.execute(query, params)
            if fetch:
                result = cursor.fetchall()
                logger.debug(f"Query returned {len(result) if result else 0} rows")
                return result
            conn.commit()
            logger.debug("Query executed successfully")
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error executing query: {str(e)}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        raise
    finally:
        if conn:
            release_db_connection(conn)

def execute_query_dict(query, params=None):
    """Execute a query and return results as a list of dictionaries"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            logger.debug(f"Executing query: {query}")
            logger.debug(f"With params: {params}")
            cursor.execute(query, params)
            result = cursor.fetchall()
            logger.debug(f"Query returned {len(result) if result else 0} rows")
            return [dict(row) for row in result]
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error executing query: {str(e)}")
        logger.error(f"Query: {query}")
        logger.error(f"Params: {params}")
        raise
    finally:
        if conn:
            release_db_connection(conn)

def execute_many(query, params_list):
    """Execute multiple queries with different parameters"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.executemany(query, params_list)
            conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error executing multiple queries: {e}")
        raise
    finally:
        if conn:
            release_db_connection(conn)

def close_all_connections():
    """Close all connections in the pool"""
    if connection_pool:
        connection_pool.closeall()
        print("All database connections closed.")