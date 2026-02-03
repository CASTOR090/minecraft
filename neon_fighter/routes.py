from flask import Blueprint, render_template

fighter_bp = Blueprint('fighter', __name__, 
                    template_folder='templates',
                    static_folder='static',
                    static_url_path='/fighter/static')

@fighter_bp.route('/')
def index():
    return render_template('fighter.html')
