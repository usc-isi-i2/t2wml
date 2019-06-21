from flask import Flask
import os
__CWD__ = os.getcwd()
UPLOAD_FOLDER = __CWD__ + "\\uploads"

app = Flask(__name__)
app.secret_key = "secret key"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024