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


app = Flask(__name__, static_folder=None)

class NumpyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.generic):
            return o.item()
        return json.JSONEncoder.default(self, o)

app.json_encoder=NumpyEncoder
CORS(app, supports_credentials=True)


projects_dir= "/proj"
if os.name == 'nt': #used for debugging purposes
    projects_dir=os.path.join(os.path.abspath(os.path.dirname(__file__)), "media")



class AppConfig:
    USE_CACHE = True
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB max file size
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
                              'sqlite:///' + os.path.join(DATADIR, 'entitiesWithID.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    STATIC_FOLDER = os.path.join(BASEDIR, 'static') #This is used only in commented out code for serving static files
    PROJECTS_DIR=projects_dir
    SECRET_KEY = os.getenv('SECRET_KEY', 'my_precious') #Obviously this needs to be overwritten in production versions


app.config.from_object(AppConfig)

DEFAULT_SPARQL_ENDPOINT = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'


## LOG STUFF - can uncomment if you want to do logging

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

