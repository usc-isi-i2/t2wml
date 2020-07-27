import sys
import os
from pathlib import Path
import uuid
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from flask_migrate import Migrate, upgrade, current, init

BASEDIR = os.path.abspath(os.path.dirname(__file__))
if BASEDIR not in sys.path:
    sys.path.append(BASEDIR) #when running migrate, needed to not get import errors

UPLOAD_FOLDER = os.path.join(BASEDIR, "storage")
DOWNLOAD_FOLDER = os.path.join(BASEDIR, "downloads")

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

#############SQL STUFF

AUTO_MIGRATE= "sqlite" in AppConfig.SQLALCHEMY_DATABASE_URI #only set to true if database is sqlite
#MIGRATE_DIR=os.path.join(BASEDIR, "migrations")

def auto_constraint_name(constraint, table):
    if constraint.name is None or constraint.name == "_unnamed_":
        return "sa_autoname_%s" % str(uuid.uuid4())[0:5]
    else:
        return constraint.name

convention = {
    "auto_constraint_name": auto_constraint_name,
    "ix": 'ix_%(column_0_label)s',
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(auto_constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}


metadata = MetaData(naming_convention=convention)

db = SQLAlchemy(app, metadata=metadata)

from models import *
from wikidata_models import *

migrate = Migrate(app, db, render_as_batch=True) #, directory=MIGRATE_DIR


if AUTO_MIGRATE:
    with app.app_context():
        upgrade(directory=os.path.join(BASEDIR, 'migrations'))