# -*- mode: python ; coding: utf-8 -*-
# Pyinstaller spec file.

# pip install --upgrade pyinstaller
# pyinstaller --clean --noupx .\t2wml-waitress.spec

from PyInstaller.utils.hooks import copy_metadata
import sys
from os import path, getcwd
site_packages = next(p for p in sys.path if 'site-packages' in p)

def copy_package(name):
    return [(path.join(site_packages, name), name)]
    
block_cipher = None


a = Analysis(['t2wml-waitress.py'],
             pathex=[getcwd()],
             binaries=[],
             datas=copy_package('distributed'),
             hiddenimports=['pandas','pandas._libs.tslibs.base', 'rltk', 'logging.config', 'cmath'],
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
          name='t2wml-waitress',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          upx_exclude=[],
          runtime_tmpdir=None,
          console=True )