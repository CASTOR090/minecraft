from flask import Blueprint, render_template

hockey_bp = Blueprint('hockey', __name__, 
                      template_folder='templates',
                      static_folder='static',
                      static_url_path='/hockey/static')

@hockey_bp.route('/')
def index():
    return render_template('hockey.html')
