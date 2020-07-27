# Prepares a standalone deployment, updating versions too
from argparse import ArgumentParser
import os
import shutil


def parse_args():
    parser = ArgumentParser()
    parser.add_argument('--version', type=str, default=None, help='Version number for deployment')
    return parser.parse_args()

def prepare_version(version):
    # The version should look like "x.y.z" and possibly with "a#" or "b#" for alpha and beta versions
    backend_version = version
    with open('version.py', 'w') as bf:
        print(f"__version__ = '{backend_version}'", file=bf)

    frontend_version = version.replace('a', 'α').replace('b', 'β')
    with open('frontend/.env.production.local', 'w', encoding='utf-8') as ff:
        print(f'REACT_APP_VERSION = "{frontend_version}"', file=ff)
    print(f"Updated backend version to {backend_version} and frontend version to {frontend_version}")

def build_frontend():
    print('Building frontend...')
    cwd = os.getcwd()
    try:
        os.chdir('frontend')
        shutil.rmtree('build', ignore_errors=True)
        os.system('yarn install')
        os.system('yarn build')
    finally:
        os.chdir(cwd)

def copy_frontend_to_static():
    print("Copying frontend files to backend's static folder...")
    shutil.rmtree(os.path.join('backend','static'), ignore_errors=True)
    shutil.copytree(os.path.join('frontend', 'build'), os.path.join('backend','static'))

def build_package():
    print("Building package...")
    os.system("python setup.py sdist bdist_wheel")


def run():
    args = parse_args()
    if args.version:
        prepare_version(args.version)
    
    build_frontend()
    copy_frontend_to_static()
    build_package()
    print("Done, you can now upload the package to the PyPI repository")

if __name__ == '__main__':
    run()
