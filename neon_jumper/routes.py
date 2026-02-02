from flask import Blueprint, render_template

jumper_bp = Blueprint('jumper', __name__, 
                    template_folder='templates',
                    static_folder='static',
                    static_url_path='/jumper/static')

@jumper_bp.route('/')
def index():
    return render_template('jumper.html')
