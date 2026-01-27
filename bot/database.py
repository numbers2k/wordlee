import os
import json
import logging
from contextlib import contextmanager
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

logger = logging.getLogger(__name__)
_pool = None


def init_db():
    global _pool
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.warning("DATABASE_URL not set, database features will be unavailable")
        return False
    
    try:
        _pool = ThreadedConnectionPool(minconn=1, maxconn=10, dsn=database_url)
        logger.info("Database connection pool created")
        create_tables()
        return True
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return False


def create_tables():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id BIGINT PRIMARY KEY,
                    username VARCHAR(255),
                    first_name VARCHAR(255),
                    total_games INTEGER DEFAULT 0,
                    games_won INTEGER DEFAULT 0,
                    current_streak INTEGER DEFAULT 0,
                    max_streak INTEGER DEFAULT 0,
                    total_points INTEGER DEFAULT 0,
                    guess_distribution JSONB DEFAULT '[0,0,0,0,0,0]'::jsonb,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_users_total_points 
                ON users(total_points DESC);
            """)
            conn.commit()
            logger.info("Database tables created/verified")


@contextmanager
def get_connection():
    if not _pool:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    conn = _pool.getconn()
    try:
        yield conn
    finally:
        _pool.putconn(conn)


def get_user(user_id):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
            return cur.fetchone()


def create_or_update_user(user_id, username=None, first_name=None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (user_id, username, first_name, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    username = COALESCE(EXCLUDED.username, users.username),
                    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
                    updated_at = CURRENT_TIMESTAMP
                RETURNING user_id
            """, (user_id, username, first_name))
            conn.commit()
            return cur.fetchone()[0]


def update_user_stats(user_id, won, attempts, points_earned):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT total_games, games_won, current_streak, max_streak, 
                       total_points, guess_distribution
                FROM users WHERE user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            
            if not row:
                create_or_update_user(user_id)
                cur.execute("""
                    SELECT total_games, games_won, current_streak, max_streak, 
                           total_points, guess_distribution
                    FROM users WHERE user_id = %s
                """, (user_id,))
                row = cur.fetchone()
            
            total_games, games_won, current_streak, max_streak, total_points, guess_dist = row
            
            new_total_games = total_games + 1
            new_games_won = games_won + (1 if won else 0)
            
            if won:
                new_current_streak = current_streak + 1
                new_max_streak = max(max_streak, new_current_streak)
                new_total_points = total_points + points_earned
                dist = json.loads(guess_dist) if isinstance(guess_dist, str) else guess_dist
                if 1 <= attempts <= 6:
                    dist[attempts - 1] = dist[attempts - 1] + 1
            else:
                new_current_streak = 0
                new_max_streak = max_streak
                new_total_points = total_points
                dist = json.loads(guess_dist) if isinstance(guess_dist, str) else guess_dist
            
            cur.execute("""
                UPDATE users SET
                    total_games = %s,
                    games_won = %s,
                    current_streak = %s,
                    max_streak = %s,
                    total_points = %s,
                    guess_distribution = %s::jsonb,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (new_total_games, new_games_won, new_current_streak, 
                  new_max_streak, new_total_points, json.dumps(dist), user_id))
            conn.commit()


def get_leaderboard(limit=10, user_id=None):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT user_id, username, first_name, total_points
                FROM users
                WHERE total_points > 0
                ORDER BY total_points DESC
                LIMIT %s
            """, (limit,))
            top_players = cur.fetchall()
            
            user_position = None
            user_data = None
            
            if user_id:
                cur.execute("""
                    SELECT COUNT(*) + 1 as position
                    FROM users
                    WHERE total_points > (
                        SELECT COALESCE(total_points, 0) FROM users WHERE user_id = %s
                    )
                """, (user_id,))
                position_row = cur.fetchone()
                user_position = position_row['position'] if position_row else None
                
                cur.execute("""
                    SELECT user_id, username, first_name, total_points
                    FROM users
                    WHERE user_id = %s
                """, (user_id,))
                user_data = cur.fetchone()
            
            return {
                'top_players': top_players,
                'user_position': user_position,
                'user_data': user_data
            }


def get_user_stats(user_id):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT user_id, username, first_name,
                       total_games, games_won, current_streak, max_streak,
                       total_points, guess_distribution
                FROM users WHERE user_id = %s
            """, (user_id,))
            return cur.fetchone()
# v1.3.0
