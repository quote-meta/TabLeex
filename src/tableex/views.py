from flask import render_template
from tableex import app

@app.route('/')
def index():
    return render_template('tableex/index.html')