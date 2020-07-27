import os
import sys

# Make sure we can import other files from this directory
#BASEDIR = os.path.abspath(os.path.dirname(__file__))
#if BASEDIR not in sys.path:
#    sys.path.append(BASEDIR) 

print('WSGI is here, from ', __file__)
print(sys.path)

from application import app
if __name__ == '__main__':
    app.run()