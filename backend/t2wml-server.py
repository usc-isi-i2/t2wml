import os
import sys

# Make sure we can import other files from this directory
#BASEDIR = os.path.abspath(os.path.dirname(__file__))
#if BASEDIR not in sys.path:
#    sys.path.append(BASEDIR) 

try:
    port = int(sys.argv[1])
except:
    port = 13000

from application import app
if __name__ == '__main__':
    app.run(port=port, debug=False, use_reloader=False)