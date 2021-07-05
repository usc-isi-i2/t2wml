import sys
import os
import json
import numpy as np
from pathlib import Path
from flask import Flask
from flask_cors import CORS

home_dir = os.environ.get("T2WMLHOME")
if not home_dir:
    home_dir = str(Path.home())
DATADIR = os.path.join(home_dir, ".t2wml")
if not os.path.exists(DATADIR):
    os.makedirs(DATADIR)

BASEDIR = os.path.abspath(os.path.dirname(__file__))
if BASEDIR not in sys.path:
    sys.path.append(BASEDIR)  # when running migrate, needed to not get import errors

CACHE_FOLDER = os.path.join(DATADIR, "cache")
Path(CACHE_FOLDER).mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder=None)

class NumpyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.generic):
            return o.item()
        return json.JSONEncoder.default(self, o)

app.json_encoder=NumpyEncoder
CORS(app, supports_credentials=True)


class AppConfig:
    USE_CACHE = True
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max file size
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
                              'sqlite:///' + os.path.join(DATADIR, 'entitiesWithID.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    STATIC_FOLDER = os.path.join(BASEDIR, 'static')
    PROJECTS_DIR= os.path.join(BASEDIR, "media")


app.config.from_object(AppConfig)

DEFAULT_SPARQL_ENDPOINT = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'


## LOG STUFF

'''
import logging
from datetime import datetime
log_dir=os.path.join(DATADIR, "logs")
if not os.path.exists(log_dir):
    os.makedirs(log_dir)
now=datetime.now()
dt_string = now.strftime("%Y-%m-%d_%H-%M-%S")
log_file=os.path.join(log_dir, dt_string+"t2wml.log")
handler = logging.FileHandler(log_file, 'a', 'utf-8')
logging.basicConfig(level=logging.DEBUG, handlers=[handler])
web_logger=logging.getLogger('web-t2wml')
'''





#############SQL STUFF
"""
AUTO_MIGRATE = "sqlite" in AppConfig.SQLALCHEMY_DATABASE_URI  # only set to true if database is sqlite


# MIGRATE_DIR=os.path.join(BASEDIR, "migrations")

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

from wikidata_models import *

migrate = Migrate(app, db, render_as_batch=True)  # , directory=MIGRATE_DIR

if AUTO_MIGRATE:
    with app.app_context():
        upgrade(directory=os.path.join(BASEDIR, 'migrations')) """
