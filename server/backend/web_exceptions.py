class WebException(Exception):
    message="Undefined web exception"
    code=400

    def __init__(self, message=""):
        super().__init__(message)
        self.detail_message=message

    @property
    def error_dict(self):
        return {
            "errorCode": self.code,
            "errorTitle": self.message,
            "errorDescription": self.detail_message
        }

class ProjectNotFoundException(WebException):
    code=404
    message="Project not found"

class NoFilePartException(WebException):
    message="Missing file parameter in the upload request"

class BlankFileNameException(WebException):
    message = "Resource not selected for uploading"

class AuthenticationFailureException(WebException):
    message = "Authentication failed"

class InvalidRequestException(WebException):
    message="Resource requested without appropriate arguments"

class YAMLEvaluatedWithoutDataFileException(WebException):
    message = "Cannot evaluate YAML file without the data file"
    
class MissingYAMLFileException(WebException):
    message = "YAML file not found"

class CellResolutionWithoutYAMLFileException(WebException):
    message = "Cannot resolve cell without the YAML file"

class WikifyWithoutDataFileException(WebException):
    message = "Wikification cannot be done without the data file"

class FileTypeNotSupportedException(WebException):
    message= "This file type is currently not supported"

#possibly to be deleted
class InvalidYAMLFileException(WebException):
    message = "YAML file is either empty or not valid"