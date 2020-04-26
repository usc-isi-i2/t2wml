import sys
import os
from flask import Flask
from flask_cors import CORS
from pathlib import Path
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate, upgrade, current, init

sys.path.append(os.getcwd()) #when running migrate, needed to not get import errors


basedir = os.path.abspath(os.path.dirname(__file__))

__CWD__ = os.getcwd()
UPLOAD_FOLDER = (Path.cwd() / "config" / "uploads")
CODE_FOLDER = str(Path.cwd() / "Code")
ETK_PATH = str(Path.cwd().parent / "etk")
DOWNLOAD_FOLDER = str(Path.cwd() / "downloads")
AUTO_MIGRATE=True #only set to true if database is sqlite

app = Flask(__name__, static_folder="t2wml-gui")
CORS(app, supports_credentials=True)
app.secret_key = "secret key" # This will no longer be used once we stop using session cookies

class AppConfig:
    UPLOAD_FOLDER = UPLOAD_FOLDER
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024 # 16 MB max file size
    CODE_FOLDER = CODE_FOLDER
    ETK_PATH = ETK_PATH
    downloads = DOWNLOAD_FOLDER
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

app.config.from_object(AppConfig)

DEFAULT_SPARQL_ENDPOINT = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
GOOGLE_CLIENT_ID = '552769010846-tpv08vhddblg96b42nh6ltg36j41pln1.apps.googleusercontent.com'

db = SQLAlchemy(app)
from backend_code.models import *
from backend_code.wikidata_property import WikidataProperty

migrate = Migrate(app, db)


if AUTO_MIGRATE:
    with app.app_context():
        upgrade(directory=os.path.join(basedir, 'migrations'))