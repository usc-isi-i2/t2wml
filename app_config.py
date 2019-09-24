from flask import Flask
import os
from flask_cors import CORS
from pathlib import Path
from Code.UserStore import UserStore


__CWD__ = os.getcwd()
UPLOAD_FOLDER = str(Path.cwd() / "config" / "uploads")
CODE_FOLDER = str(Path.cwd() / "Code")
ETK_PATH = str(Path.cwd().parent / "etk")
DOWNLOAD_FOLDER = str(Path.cwd() / "new_properties")
__users__ = Users.get_instance()

app = Flask(__name__, template_folder="templates", static_folder="t2wml-gui")
CORS(app)
app.secret_key = "secret key"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# 16 MB max file size
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['CODE_FOLDER'] = CODE_FOLDER
app.config['ETK_PATH'] = ETK_PATH
app.config['downloads'] = DOWNLOAD_FOLDER
app.config['USER_STORE'] = __user_store__

