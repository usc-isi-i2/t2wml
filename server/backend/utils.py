from google.oauth2 import id_token
from google.auth.transport import requests 
from string import punctuation
from flask import request
import web_exceptions
from app_config import GOOGLE_CLIENT_ID

def make_frontend_err_dict(error):
    '''
    convenience function to convert all errors to frontend readable ones
    '''
    return {
            "errorCode": 500,
            "errorTitle": "Undefined Backend Error",
            "errorDescription": str(error)
        }

def string_is_valid(text: str) -> bool:
    def check_special_characters(text: str) -> bool:
        return all(char in punctuation for char in str(text))
    if text is None or check_special_characters(text):
        return False
    text=text.strip().lower()
    if text in ["", "#na", "nan"]:
        return False
    return True

def verify_google_login(tn):
    """
    This function verifies the oauth token by sending a request to Google's server.
    :param tn:
    :return:
    """
    error = None
    try:
        # client_id = '552769010846-tpv08vhddblg96b42nh6ltg36j41pln1.apps.googleusercontent.com'
        request = requests.Request()
        user_info = id_token.verify_oauth2_token(tn, request, GOOGLE_CLIENT_ID)

        if user_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise web_exceptions.AuthenticationFailureException("Token issued by an invalid issuer")
            user_info = None

    except ValueError as e:
        user_info = None
        raise web_exceptions.AuthenticationFailureException(str(e))
    return user_info, error



def file_upload_validator(file_extensions):
    if 'file' not in request.files:
        raise web_exceptions.NoFilePartException("Missing 'file' parameter in the file upload request")

    in_file = request.files['file']
    if in_file.filename == '':
        raise web_exceptions.BlankFileNameException("No file selected for uploading")
    
    file_extension=in_file.filename.split(".")[-1].lower()
    file_allowed = file_extension in file_extensions
    if not file_allowed:
        raise web_exceptions.FileTypeNotSupportedException("File with extension '"+file_extension+"' is not allowed")

    return in_file