from gevent import monkey
monkey.patch_all()

from gevent.pywsgi import WSGIServer
from causx_application import app
import os

key_file = os.environ.get('T2WML_SSL_KEY')
cert_file = os.environ.get('T2WML_SSL_CERT')

if key_file is None or cert_file is None:
    key_file = cert_file = None
    print('Not using SSL. Printing all environment variables that start with T')
    for (key, value) in os.environ.items():
        if key[0] == 'T':
            print(f"{key}: {value}")
    http_server = WSGIServer(('localhost', 13000), app)
else:
    print('Using SSL - certificate from %s, key from %s' % (cert_file, key_file))
    http_server = WSGIServer(('localhost', 13000), app, keyfile=key_file, certfile=cert_file)

print('Starting gevent server')
http_server.serve_forever()
