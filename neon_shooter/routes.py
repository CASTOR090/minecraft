from flask import Blueprint, render_template

shooter_bp = Blueprint('shooter', __name__, 
                       template_folder='templates',
                       static_folder='static',
                       static_url_path='/shooter/static')

@shooter_bp.route('/')
def index():
    return render_template('shooter.html')
