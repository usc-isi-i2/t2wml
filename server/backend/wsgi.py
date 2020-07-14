import os
import sys

# Make sure we can import other files from this directory
BASEDIR = os.path.abspath(os.path.dirname(__file__))
if BASEDIR not in sys.path:
    sys.path.append(BASEDIR) 

from application import app
if __name__ == '__main__':
    app.run()