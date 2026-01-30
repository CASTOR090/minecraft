from flask import Blueprint, render_template

racer_bp = Blueprint('racer', __name__, 
                    template_folder='templates',
                    static_folder='static',
                    static_url_path='/static/racer')

@racer_bp.route('/')
def index():
    return render_template('racer.html')
