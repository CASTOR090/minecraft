import json
import os
from flask import Blueprint, render_template, request, jsonify

snake_bp = Blueprint('snake', __name__, 
                     template_folder='templates',
                     static_folder='static',
                     static_url_path='/snake/static')

SCORE_FILE = os.path.join(os.path.dirname(__file__), 'highscore.json')

def load_highscore():
    if not os.path.exists(SCORE_FILE):
        return 0
    try:
        with open(SCORE_FILE, 'r') as f:
            data = json.load(f)
            return data.get('highscore', 0)
    except:
        return 0

def save_highscore(score):
    current_high = load_highscore()
    if score > current_high:
        try:
            with open(SCORE_FILE, 'w') as f:
                json.dump({'highscore': score}, f)
            return True
        except:
            return False
    return False

@snake_bp.route('/')
def index():
    return render_template('snake.html')

@snake_bp.route('/api/score', methods=['GET', 'POST'])
def handle_score():
    if request.method == 'POST':
        data = request.json
        new_score = data.get('score', 0)
        is_new_record = save_highscore(new_score)
        return jsonify({
            'success': True, 
            'is_new_record': is_new_record,
            'highscore': load_highscore()
        })
    else:
        return jsonify({'highscore': load_highscore()})
