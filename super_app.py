from flask import Flask, redirect, url_for
import os
import sys

# Adiciona os subdiretórios ao path para que possamos importar os blueprints
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from arcade_home.routes import home_bp
from neon_snake.routes import snake_bp
from neon_pong.routes import pong_bp
from neon_hockey.routes import hockey_bp
from neon_shooter.routes import shooter_bp
from neon_racer.routes import racer_bp

app = Flask(__name__)

# Registra os Blueprints com seus respectivos prefixos de URL
app.register_blueprint(home_bp, url_prefix='/')
app.register_blueprint(snake_bp, url_prefix='/snake')
app.register_blueprint(pong_bp, url_prefix='/pong')
app.register_blueprint(hockey_bp, url_prefix='/hockey')
app.register_blueprint(shooter_bp, url_prefix='/shooter')
app.register_blueprint(racer_bp, url_prefix='/racer')

if __name__ == '__main__':
    print("Iniciando Super Arcade na porta 8080...")
    print("Acesse: http://127.0.0.1:8080")
    app.run(debug=True, port=8080)
