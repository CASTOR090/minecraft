import json
import os
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

SCORE_FILE = 'highscore.json'

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/score', methods=['GET', 'POST'])
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

if __name__ == '__main__':
    app.run(debug=True, port=5001)
