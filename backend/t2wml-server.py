import argparse

parser = argparse.ArgumentParser(description='Run t2wml backend')
parser.add_argument('port', nargs='?', default=13000,
                    help='specify the port (default 13000')
parser.add_argument('--public-server', action='store_true', default=False,
                    help='run the server on a public host (security risk, use only for docker containers)')
parser.add_argument('--causx', action='store_true', default=False,
                    help='run causx version of t2wml')


args=parser.parse_args()
port=args.port
public_server=args.public_server
causx = args.causx
host='0.0.0.0' if public_server else None

if causx:
    from causx_application import app
    if __name__ == '__main__':
        app.run(port=port, debug=False, host=host, use_reloader=False)

else:
    from application import app
    if __name__ == '__main__':
        app.run(port=port, debug=False, host=host, use_reloader=False)
