# -*- mode: python ; coding: utf-8 -*-

"""
# Prerequisites:
cd backend
virtualenv env-service
(activate virtual env)
pip install -r requirements.txt
pip install --upgrade pyinstaller
pip install pywin32
pip install waitress
pip install requests
pip install t2wml-api
# Build:
pyinstaller  --clean --noupx t2wml-service.spec
# With Administrator privilges
# Install:
dist\t2wml-service.exe install
# Start:
dist\t2wml-service.exe start
# Debug:
dist\t2wml-service.exe debug
# Stop:
dist\t2wml-service.exe stop
# Uninstall:
dist\t2wml-service.exe remove
"""

import sys
from os import path, getcwd
site_packages = next(p for p in sys.path if 'site-packages' in p)

def copy_package(name):
    return [(path.join(site_packages, name), name)]

block_cipher = None


a = Analysis(['t2wml-service.py'],
             pathex=[getcwd()],
             binaries=[],
             datas=copy_package('distributed'),
             hiddenimports=['win32timezone', 'pandas','pandas._libs.tslibs.base', 'rltk', 'logging.config', 'cmath'],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)

pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)

exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          [],
          name='t2wml-service',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          upx_exclude=[],
          runtime_tmpdir='.',
          console=True,
          disable_windowed_traceback=False,
          target_arch=None,
          codesign_identity=None,
          entitlements_file=None 
          )