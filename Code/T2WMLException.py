import enum


class T2WMLException(enum.Enum):
	InvalidRequest = "Resource requested without appropriate arguments"
	ProjectsNotFound = "Existing projects might have been deleted manually"
	NoFilePart = "Missing file argument in the upload request"
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
