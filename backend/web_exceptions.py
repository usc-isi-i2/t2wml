def make_frontend_err_dict(error):
    '''
    convenience function to convert all errors to frontend readable ones
    '''
    return {
        "errorCode": 500,
        "errorTitle": error.__class__.__name__,
        "errorDescription": str(error)
    }

class WebException(Exception):
    errorTitle = "Undefined web exception"
    code = 400

    def __init__(self, message=""):
        super().__init__(message)
        self.detail_message = message

    @property
    def error_dict(self):
        return {
            "errorCode": self.code,
            "errorTitle": self.errorTitle,
            "errorDescription": self.detail_message
        }


class ProjectNotFoundException(WebException):
    code = 404
    errorTitle = "Project not found"


class ProjectAlreadyExistsException(WebException):
    errorTitle = "Cannot create new project in folder with existing project"


class NoFilePartException(WebException):
    errorTitle = "Missing file parameter in the upload request"


class BlankFileNameException(WebException):
    errorTitle = "Resource not selected for uploading"


class AuthenticationFailureException(WebException):
    errorTitle = "Authentication failed"


class InvalidRequestException(WebException):
    errorTitle = "Resource requested without appropriate arguments"


class YAMLEvaluatedWithoutDataFileException(WebException):
    errorTitle = "Cannot evaluate YAML file without the data file"


class MissingYAMLFileException(WebException):
    errorTitle = "YAML file not found"


class CellResolutionWithoutYAMLFileException(WebException):
    errorTitle = "Cannot resolve cell without the YAML file"


class WikifyWithoutDataFileException(WebException):
    errorTitle = "Wikification cannot be done without the data file"


class FileTypeNotSupportedException(WebException):
    errorTitle = "This file type is currently not supported"


class InvalidYAMLFileException(WebException):
    errorTitle = "YAML file is either empty or not valid"

class FileOpenElsewhereError(WebException):
    code=403
    errorTitle = "IOError"
