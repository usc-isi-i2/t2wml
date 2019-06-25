from flask import Flask
import os
from flask_cors import CORS

__CWD__ = os.getcwd()
UPLOAD_FOLDER = __CWD__ + "\\uploads"
CODE_FOLDER = __CWD__ + "\\Code"
app = Flask(__name__)
CORS(app)
app.secret_key = "secret key"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['CODE_FOLDER'] = CODE_FOLDER
