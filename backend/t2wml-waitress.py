from waitress import serve

from application import app

def run():
    app.run(port=13000, debug=False, host=None, use_reloader=False)

serve(run())

# serve(wsgiapp, host='localhost', port=13000)