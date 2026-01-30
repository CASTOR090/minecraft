from flask import Blueprint, render_template

pong_bp = Blueprint('pong', __name__, 
                    template_folder='templates',
                    static_folder='static',
                    static_url_path='/pong/static')

@pong_bp.route('/')
def index():
    return render_template('pong.html')
