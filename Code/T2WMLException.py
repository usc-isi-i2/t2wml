from enum import Enum


class T2WMLException(str, Enum):
	InvalidRequest = "Resource requested without appropriate arguments"
	ProjectsNotFound = "No projects found"
	NoFilePart = "Missing file parameter in the upload request"
	BlankFileName = "Resource not selected for uploading"
	FileTypeNotSupported = "This file type is currently not supported"
	InvalidYAMLFile = "YAML file is either empty or not valid"
	YAMLEvaluatedWithoutDataFile = "Cannot evaluate YAML file without the data file"
	MissingYAMLFile = "YAML file not found"
	CellResolutionWithoutYAMLFile = "Cannot resolve cell without the YAML file"
	WikifyWithoutDataFile = "Wikification cannot be done without the data file"
	FileTooLarge = "File exceeds the permitted file size"
	KeyErrorInYAMLFile = "Key not found in the YAML specification"
	ValueErrorInYAMLFile = "Value of a key in the YAML specification is not appropriate"
	AuthenticationFailure = "Authentication failed"
	InvalidOperator = "Invalid operator in found in YAML specification"
	ValueOutOfBound = "Value is outside the permissible limits"
	ItemNotFound = "Couldn't find item in item table"
	InvalidT2WMLExpression = "Invalid T2WML expression found"
	ConstraintViolationError = "Constraint on a given set of values have been violated"