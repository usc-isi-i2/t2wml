# Command line scripts for running as an installed package

# Scripts that are run from the command line after installation as a package
# They basically just delegate everything to management commands
import os

def run_server():
    dirname = os.path.dirname(os.path.abspath(__file__))
    print('Launching Flask from ', dirname)
    os.environ['FLASK_APP'] = 'backend.wsgi'
    os.system('flask run --port 13000')

