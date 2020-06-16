def make_frontend_err_dict(error):
    '''
    convenience function to convert all errors to frontend readable ones
    '''
    return {
            "errorCode": 500,
            "errorTitle": "Undefined Backend Error",
            "errorDescription": str(error)
        }

class T2WMLException(Exception):
    message="Undefined T2WML exception"
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
    

class PropertyTypeNotFound(T2WMLException):
    message="Property type not found"

class InvalidRequestException(T2WMLException):
    message="Resource requested without appropriate arguments"


class ProjectsNotFoundException(T2WMLException):
    message="No projects found"
    code = 404

class NoFilePartException(T2WMLException):
    message="Missing file parameter in the upload request"

class BlankFileNameException(T2WMLException):
    message = "Resource not selected for uploading"

class FileTypeNotSupportedException(T2WMLException):
    message= "This file type is currently not supported"

class InvalidYAMLFileException(T2WMLException):
    message = "YAML file is either empty or not valid"

class BadDateFormatException(InvalidYAMLFileException):
    pass

class MissingWikidataEntryException(InvalidYAMLFileException):
    pass

class TemplateDidNotApplyToInput(InvalidYAMLFileException):
    def __init__(self, message="Could not apply", errors={}):
        super().__init__(message)
        self.errors=errors


class YAMLEvaluatedWithoutDataFileException(T2WMLException):
    message = "Cannot evaluate YAML file without the data file"
    
class MissingYAMLFileException(T2WMLException):
    message = "YAML file not found"

class CellResolutionWithoutYAMLFileException(T2WMLException):
    message = "Cannot resolve cell without the YAML file"

class WikifyWithoutDataFileException(T2WMLException):
    message = "Wikification cannot be done without the data file"

class FileTooLargeException(T2WMLException):
    message = "File exceeds the permitted file size"

class ErrorInYAMLFileException(T2WMLException): 
    message= "Key not found in the YAML specification or value of a key in the YAML specification is not appropriate"

class ValueErrorInYAMLFileException(T2WMLException):
    message = "Value of a key in the YAML specification is not appropriate"

class AuthenticationFailureException(T2WMLException):
    message = "Authentication failed"

class InvalidOperatorException(T2WMLException):
    message = "Invalid operator in found in YAML specification"

class ValueOutOfBoundException(T2WMLException):
    message = "Value is outside the permissible limits"

class ItemNotFoundException(T2WMLException):
    message = "Couldn't find item in item table"

class InvalidT2WMLExpressionException(T2WMLException):
    message = "Invalid T2WML expression found"


class ConstraintViolationErrorException(T2WMLException):
    message = "Constraint on a given set of values have been violated"