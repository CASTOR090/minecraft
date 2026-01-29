import os
from flask import Flask, render_template, redirect

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Em um ambiente real, você usaria um servidor central ou rotas para cada jogo.
    # Para este exemplo, a Home irá redirecionar para as portas onde os jogos estão rodando.
    app.run(debug=True, port=8000)
