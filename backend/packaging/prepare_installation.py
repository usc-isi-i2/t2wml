# Prepares a standalone deployment, updating versions too
from argparse import ArgumentParser
import os
import shutil

backend_path = None
frontend_path = None

def parse_args():
    parser = ArgumentParser()
    parser.add_argument('--version', type=str, default=None, help='Version number for deployment')
    parser.add_argument('--skip-frontend', action="store_true", default=False, help='Skip building the frontend')
    return parser.parse_args()

def get_paths():
    # Returns the paths for the frontend and backend, all relative to this module.
    # The backend is one directory up, the frontend is a sibling directory of the backend.
    global backend_path, frontend_path
    
    backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_path = os.path.join(os.path.dirname(backend_path), 'frontend')


def prepare_version(version):
    global frontend_path

    # The version should look like "x.y.z" and possibly with "a#" or "b#" for alpha and beta versions
    #backend_version = version
    #with open('version.py', 'w') as bf:
    #    print(f"__version__ = '{backend_version}'", file=bf)

    frontend_version = version.replace('a', 'α').replace('b', 'β')
    with open(os.path.join(frontend_path, '.env.production.local'), 'w', encoding='utf-8') as ff:
        print(f'REACT_APP_VERSION = "{frontend_version}"', file=ff)
    print(f"Updated frontend version to {frontend_version}")

def build_frontend():
    global frontend_path
    print('Building frontend...')
    cwd = os.getcwd()
    try:
        os.chdir(frontend_path)
        shutil.rmtree('build', ignore_errors=True)
        os.system('yarn install')
        os.system('yarn build')
    finally:
        os.chdir(cwd)

def copy_frontend_to_static():
    global backend_path, frontend_path

    print("Copying frontend files to backend's static folder...")
    shutil.rmtree(os.path.join(backend_path,'static'), ignore_errors=True)
    shutil.copytree(os.path.join(frontend_path, 'build'), os.path.join(backend_path, 'static'))

def build_installer():
    print("Building installation...")

    sep = ';' if os.name=='nt' else ':'
    cwd = os.getcwd()
    try:
        os.chdir(backend_path)
        cmd = f'pyinstaller -F --add-data "./migrations{sep}migrations" --add-data "./static{sep}static" --runtime-hook packaging/pyinstaller_hooks.py t2wml-server.py'
        print('Running ', cmd)
        os.system(cmd)
    finally:
        os.chdir(cwd)


def run():
    args = parse_args()
    get_paths()
    if args.version:
        prepare_version(args.version)
    
    if not args.skip_frontend:
        build_frontend()
    copy_frontend_to_static()
    build_installer()
    print("Done, look in the ", os.path.join(backend_path, 'dist'), ' directory')

if __name__ == '__main__':
    run()
