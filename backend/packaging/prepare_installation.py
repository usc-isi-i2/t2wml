# Prepares a standalone deployment, updating versions too
from argparse import ArgumentParser
import os
import shutil
import platform
import semver

backend_path = None
# frontend_path = None
electron_path = None

def parse_args():
    parser = ArgumentParser()
    parser.add_argument('--version', type=str, default=None, help='Version number for deployment')
    # parser.add_argument('--skip-frontend', action="store_true", default=False, help='Skip building the frontend')
    parser.add_argument('--skip-electron-build', action="store_true", default=False, help='Skip packaging electron')
    # parser.add_argument('--zip', type=str, default=None, help='Zip file name for output')
    return parser.parse_args()

def get_paths():
    # Returns the paths for the frontend and backend, all relative to this module.
    # The backend is one directory up, the frontend is a sibling directory of the backend.
    global backend_path,electron_path
    
    backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    # frontend_path = os.path.join(os.path.dirname(backend_path), 'frontend')
    electron_path = os.path.join(os.path.dirname(backend_path), 'electron')


def prepare_version(version):
    global electron_path

    if version.startswith('refs/tags/v'):  # Github Actions may pass the full ref, not just the tag name
        version = version[11:]
    vi = semver.VersionInfo.parse(version)

    # The version should look like "x.y.z" and possibly with "a#" or "b#" for alpha and beta versions
    #backend_version = version
    #with open('version.py', 'w') as bf:
    #    print(f"__version__ = '{backend_version}'", file=bf)

    #with open(os.path.join(frontend_path, '.env.production.local'), 'w', encoding='utf-8') as ff:
    #    print(f'REACT_APP_VERSION = "{version}"', file=ff)

    # Update the electron version
    with open(os.path.join(electron_path, 'package.json'), 'r', encoding='utf-8') as ff:
        lines = ff.readlines()

    for idx, line in enumerate(lines):
        version_index = line.find('"version":')
        if version_index > -1:
            line = line[:version_index] + f'"version": "{version}",\n'
            lines[idx] = line

    with open(os.path.join(electron_path, 'package.json'), 'w', encoding='utf-8') as ff:
        ff.writelines(lines)

    print(f"Updated version to {version}")


def build_help_docs():
    t2wml_root= os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    docs_folder=os.path.join(t2wml_root, "t2wml-api", "docs")
    if not os.path.isdir(docs_folder):
        print("could not find docs folder")
        return
    try:
        import markdown
        grammar_file = os.path.join(docs_folder, "grammar.md")
        output_file = os.path.join(electron_path, "public", "grammar.html")
        markdown.markdownFromFile(
        input=grammar_file,
        output=output_file,
        encoding='utf8',
        extensions=['fenced_code', 'tables', 'attr_list', 'codehilite']
        )
        print("built grammar.html in "+output_file)
    except Exception as e: #not being able to update the help docs should not break the build
        print(e)



def build_installer():
    print("Building installation...")

    sep = ';' if os.name=='nt' else ':'
    cwd = os.getcwd()
    try:
        os.chdir(backend_path)
        cmd = f'pyinstaller --onefile --noconfirm --windowed --add-data "./migrations{sep}migrations" --runtime-hook packaging/pyinstaller_hooks.py t2wml-server.py'
        print('Running ', cmd)
        os.system(cmd)
    finally:
        os.chdir(cwd)

def build_electron(skip_electron_build=False):
    global electron_path
    print('Building electron...')
    cwd = os.getcwd()

    system = platform.system()
    os_name = { 'Windows': 'win', 'Darwin': 'mac', 'Linux':'linux' }.get(platform.system())
    if not os_name:
        raise ValueError(f'Operation system {system} not supported')

    try:
        os.chdir(electron_path)
        os.system('yarn install')
        os.system('yarn prod')

        if (os_name == 'mac'):
            os.system('chmod ugo+x t2wml-on-mac.sh')  # Make sure it is an executable.

        if not skip_electron_build:
            os.system(f'yarn build:{os_name}')
        else:
            print("Skipping electron build")
    finally:
        os.chdir(cwd)


def run():
    args = parse_args()
    get_paths()
    if args.version:
        prepare_version(args.version)
    
    #if not args.skip_frontend:
    #    build_frontend()
    #copy_frontend_to_static()
    build_help_docs()
    build_installer()

    build_electron(args.skip_electron_build)

    print("Done, look in the ", os.path.join(electron_path, 'out'), ' directory')

if __name__ == '__main__':
    run()
