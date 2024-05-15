from flask import Flask

app = Flask(__name__)
app.config.from_object('tableex.config')

import tableex.views