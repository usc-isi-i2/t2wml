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
	e_message="Undefined T2WML exception"

	def __init__(self, message=""):
		self.detail_message=message

	@property
	def error_dict(self):
		return {
			"errorCode": 500,
			"errorTitle": self.e_message,
			"errorDescription": self.detail_message
		}


class InvalidRequestException(T2WMLException):
	e_message="Resource requested without appropriate arguments"


class ProjectsNotFoundException(T2WMLException):
	e_message="No projects found"

class NoFilePartException(T2WMLException):
	e_message="Missing file parameter in the upload request"

class BlankFileNameException(T2WMLException):
	e_message = "Resource not selected for uploading"

class FileTypeNotSupportedException(T2WMLException):
	e_message= "This file type is currently not supported"

class InvalidYAMLFileException(T2WMLException):
	e_message = "YAML file is either empty or not valid"

class YAMLEvaluatedWithoutDataFileException(T2WMLException):
	e_message = "Cannot evaluate YAML file without the data file"
class MissingYAMLFileException(T2WMLException):
	e_message = "YAML file not found"

class CellResolutionWithoutYAMLFileException(T2WMLException):
	e_message = "Cannot resolve cell without the YAML file"

class WikifyWithoutDataFileException(T2WMLException):
	e_message = "Wikification cannot be done without the data file"

class FileTooLargeException(T2WMLException):
	e_message = "File exceeds the permitted file size"

class ErrorInYAMLFileException(T2WMLException): 
	e_message= "Key not found in the YAML specification or value of a key in the YAML specification is not appropriate"

class ValueErrorInYAMLFileException(T2WMLException):
	e_message = "Value of a key in the YAML specification is not appropriate"

class AuthenticationFailureException(T2WMLException):
	e_message = "Authentication failed"

class InvalidOperatorException(T2WMLException):
	e_message = "Invalid operator in found in YAML specification"

class ValueOutOfBoundException(T2WMLException):
	e_message = "Value is outside the permissible limits"

class ItemNotFoundException(T2WMLException):
	e_message = "Couldn't find item in item table"

class InvalidT2WMLExpressionException(T2WMLException):
	e_message = "Invalid T2WML expression found"

class ConstraintViolationErrorException(T2WMLException):
	e_message = "Constraint on a given set of values have been violated"