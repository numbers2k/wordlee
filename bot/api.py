import os
import logging
import json
import hmac
import hashlib
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import (
    init_db, get_user_stats, update_user_stats, 
    get_leaderboard, create_or_update_user
)

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Telegram WebApp

BOT_TOKEN = os.getenv('BOT_TOKEN')


def verify_telegram_data(init_data):
    if not BOT_TOKEN:
        return True
    
    try:
        pairs = {}
        for pair in init_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                pairs[key] = value
        
        received_hash = pairs.pop('hash', None)
        if not received_hash:
            return False
        
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(pairs.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        return calculated_hash == received_hash
    except Exception as e:
        logger.error(f"Error verifying Telegram data: {e}")
        return False


def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        init_data = request.headers.get('X-Telegram-Init-Data') or request.args.get('initData')
        if init_data and not verify_telegram_data(init_data):
            logger.warning(f"Invalid Telegram data from {request.remote_addr}")
        return f(*args, **kwargs)
    return decorated_function


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'version': '1.3.0'})


@app.route('/api/user/<int:user_id>/stats', methods=['GET'])
@require_auth
def get_stats(user_id):
    try:
        stats = get_user_stats(user_id)
        
        if not stats:
            return jsonify({
                'user_id': user_id,
                'total_games': 0,
                'games_won': 0,
                'current_streak': 0,
                'max_streak': 0,
                'total_points': 0,
                'guess_distribution': [0, 0, 0, 0, 0, 0],
                'win_percent': 0
            })
        
        if hasattr(stats, '_asdict'):
            stats = stats._asdict()
        else:
            stats = dict(stats)
        
        total_games = stats.get('total_games', 0)
        games_won = stats.get('games_won', 0)
        win_percent = round((games_won / total_games * 100) if total_games > 0 else 0)
        
        guess_dist = stats.get('guess_distribution', [0, 0, 0, 0, 0, 0])
        if isinstance(guess_dist, str):
            guess_dist = json.loads(guess_dist)
        
        return jsonify({
            'user_id': stats.get('user_id'),
            'username': stats.get('username'),
            'first_name': stats.get('first_name'),
            'total_games': stats.get('total_games', 0),
            'games_won': stats.get('games_won', 0),
            'current_streak': stats.get('current_streak', 0),
            'max_streak': stats.get('max_streak', 0),
            'total_points': stats.get('total_points', 0),
            'guess_distribution': guess_dist,
            'win_percent': win_percent
        })
    except Exception as e:
        logger.error(f"Error getting stats for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/user/<int:user_id>/game/complete', methods=['POST'])
@require_auth
def complete_game(user_id):
    try:
        data = request.get_json()
        won = data.get('won', False)
        attempts = data.get('attempts', 0)
        username = data.get('username')
        first_name = data.get('first_name')
        
        points_earned = 0
        if won and 1 <= attempts <= 6:
            points_map = {1: 1000, 2: 800, 3: 600, 4: 400, 5: 200, 6: 100}
            points_earned = points_map.get(attempts, 0)
        
        create_or_update_user(user_id, username, first_name)
        update_user_stats(user_id, won, attempts, points_earned)
        
        stats = get_user_stats(user_id)
        if hasattr(stats, '_asdict'):
            stats = stats._asdict()
        else:
            stats = dict(stats) if stats else {}
        
        return jsonify({
            'success': True,
            'points_earned': points_earned,
            'total_points': stats.get('total_points', 0)
        })
    except Exception as e:
        logger.error(f"Error completing game for user {user_id}: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/leaderboard', methods=['GET'])
@require_auth
def leaderboard():
    try:
        limit = int(request.args.get('limit', 10))
        user_id = request.args.get('user_id')
        if user_id:
            user_id = int(user_id)
        
        result = get_leaderboard(limit=limit, user_id=user_id)
        
        top_players = []
        for player in result['top_players']:
            if hasattr(player, '_asdict'):
                top_players.append(player._asdict())
            else:
                top_players.append(dict(player))
        
        user_data = None
        if result['user_data']:
            if hasattr(result['user_data'], '_asdict'):
                user_data = result['user_data']._asdict()
            else:
                user_data = dict(result['user_data'])
        
        return jsonify({
            'top_players': top_players,
            'user_position': result['user_position'],
            'user_data': user_data
        })
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    if init_db():
        logger.info("Starting API server...")
        port = int(os.getenv('API_PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        logger.error("Failed to initialize database, API server not started")
# v1.3.0
