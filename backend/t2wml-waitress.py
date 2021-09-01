from waitress import serve

from causx_application import app

#def run():
#    app.run(port=13000, debug=False, host=None, use_reloader=False)

serve(app, port=13000, host='localhost')

# serve(wsgiapp, host='localhost', port=13000)
