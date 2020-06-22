import sys
import os
from flask import Flask
from flask_cors import CORS
from pathlib import Path
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate, upgrade, current, init

BASEDIR = os.path.abspath(os.path.dirname(__file__))
if BASEDIR not in sys.path:
    sys.path.append(BASEDIR) #when running migrate, needed to not get import errors

__CWD__ = os.getcwd()
UPLOAD_FOLDER = (Path.cwd() / "storage")
DOWNLOAD_FOLDER = str(Path.cwd() / "downloads")
AUTO_MIGRATE=True #only set to true if database is sqlite

app = Flask(__name__, static_folder=None)
CORS(app, supports_credentials=True)
app.secret_key = "secret key" # This will no longer be used once we stop using session cookies

class AppConfig:
    UPLOAD_FOLDER = UPLOAD_FOLDER
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024 # 16 MB max file size
    downloads = DOWNLOAD_FOLDER
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(BASEDIR, 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    STATIC_FOLDER = os.path.join(BASEDIR, 'static')

app.config.from_object(AppConfig)

DEFAULT_SPARQL_ENDPOINT = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'
GOOGLE_CLIENT_ID = '552769010846-tpv08vhddblg96b42nh6ltg36j41pln1.apps.googleusercontent.com'

db = SQLAlchemy(app)
from models import *
from wikidata_property import *

migrate = Migrate(app, db)


if AUTO_MIGRATE:
    with app.app_context():
        upgrade(directory=os.path.join(BASEDIR, 'migrations'))