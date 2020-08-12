import os
# To import anything we need to add the backend directory into sys.path
import sys
BACKEND_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)