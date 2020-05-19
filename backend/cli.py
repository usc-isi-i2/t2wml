# Command line scripts for running as an installed package

# Scripts that are run from the command line after installation as a package
# They basically just delegate everything to management commands
import os

def run_server():
    if os.name == 'nt':
        os.system('waitress-serve --listen=0.0.0.0:5000 --threads 4 backend.wsgi:app')
    else:
        os.system('gunicorn --workers 4 --bind 0.0.0.0:5000 backend.wsgi:app')

