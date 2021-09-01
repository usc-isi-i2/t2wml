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
pip install -e ../../t2wml-api
# Build:
pyinstaller  --clean --noupx t2wml-service.spec
# With Administrator privilges
# Install:
dist\t2wml-service.exe install
# Start:
dist\t2wml-service.exe start
# Install with autostart:
dist\t2wml-service.exe --startup delayed install
# Debug:
dist\t2wml-service.exe debug
# Stop:
dist\t2wml-service.exe stop
# Uninstall:
dist\t2wml-service.exe remove
"""

import time
import ctypes
import sys
import win32serviceutil  # ServiceFramework and commandline helper
import win32service  # Events
import servicemanager  # Simple setup and logging
import win32event
from waitress import serve
import socket
import threading

from causx_application import app
class WaitressService(threading.Thread):

    def __init__(self):
        threading.Thread.__init__(self)

    def run(self):
        print('thread start\n')
        serve(app, host='localhost', port=13000, trusted_proxy='localhost')
        print('thread done\n')

    def get_id(self):
        # returns id of the respective thread
        if hasattr(self, '_thread_id'):
            return self._thread_id
        for id, thread in threading._active.items():
            if thread is self:
                return id

    def exit(self):
        thread_id = self.get_id()
        res = ctypes.pythonapi.PyThreadState_SetAsyncExc(
            thread_id, ctypes.py_object(SystemExit))
        if res > 1:
            ctypes.pythonapi.PyThreadState_SetAsyncExc(thread_id, 0)
            print('Exception raise failure')


class MyServiceFramework(win32serviceutil.ServiceFramework):

    _svc_name_ = 't2wml_backend'
    _svc_display_name_ = 'T2WML Backend Service'
    _svc_description_ = 'T2WML Backend Service for Causx'

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stopEvt = win32event.CreateEvent(None, 0, 0, None)
        socket.setdefaulttimeout(60)

    def SvcStop(self):
        """Stop the service"""
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                            servicemanager.PYS_SERVICE_STOPPED,
                            (self._svc_name_, ''))
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stopEvt)

    def SvcDoRun(self):
        """Start the service; does not return until stopped"""
        print('main start')
        servicemanager.LogMsg(servicemanager.EVENTLOG_INFORMATION_TYPE,
                            servicemanager.PYS_SERVICE_STARTED,
                            (self._svc_name_, ''))
        self.service_impl = WaitressService()
        self.ReportServiceStatus(win32service.SERVICE_RUNNING)
        # Run the service
        self.service_impl.start()

        print('waiting on win32event')
        win32event.WaitForSingleObject(self.stopEvt, win32event.INFINITE)
        self.service_impl.exit()  # raise SystemExit in inner thread
        print('waiting on thread')
        self.service_impl.join()
        print('main done')


def init():
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(MyServiceFramework)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(MyServiceFramework)


if __name__ == '__main__':
    init()
