import json
from t2wml.mapping.download import get_file_output_from_statements

from t2wml.wikification.item_table import Wikifier
from t2wml.spreadsheets.sheet import Sheet
from t2wml.mapping.statement_mapper import YamlMapper, StatementMapper

class KnowledgeGraph:
    """A knowledge graph (collection of statements) created from inputs. Also included errors and metadata.

    Attributes:

        statements(dict): A dictionary, keys cells (eg "A3"), 
            containing json-serializable statements (value, property, item, qualifier, reference)
        errors (dict): A dictionary, keys cells (eg "A3"), 
            values the key for the problematic entity within the yaml (eg, value, item, qualifier)
            within qualifier, the key is the index of the qualifier in the qualifier array,
            followed by a dictionary with the internal key within the qualifier (value, property, unit, etc)
        metadata (dict): information about the input usede to create the knowledge graph. (data_file, sheet_name)
    """
    def __init__(self, statements, errors=[], metadata={}):
        self.statements = statements
        self.errors = errors
        self.metadata = metadata

    @classmethod
    def load_json(cls, filename: str):
        """load a KnowledgeGraph instance from a saved json file.

        Args:
            filename (str): location of the json file

        Returns:
            KnowledgeGraph: an initialized KnowledgeGraph instance
        """
        with open(filename, 'r') as f:
            loaded = json.load(f)
        statements = loaded["statements"]
        errors = loaded.get("errors", [])
        metadata = loaded.get("metadata", {})
        return cls(statements, errors, metadata)

    @classmethod
    def generate(cls, statement_mapper:StatementMapper, sheet:Sheet, wikifier:Wikifier):
        """create a KnowledgeGraph instance from API classes

        Args:
            statement_mapper (StatementMapper): a statement_mapper, eg a YamlMapper
            sheet (Sheet): the sheet being used to create the knowledge graph
            wikifier (Wikifier): the wikifier used for creating an item table

        Returns:
            KnowledgeGraph: an initialized KnowledgeGraph instance
        """
        statements, errors, metadata = statement_mapper.get_all_statements(
            sheet, wikifier)
        return cls(statements, errors, metadata)

    @classmethod
    def generate_from_files(cls, data_file_path: str, sheet_name: str, yaml_file_path: str, wikifier_filepath:str):
        """create a KnowledgeGraph instance from file paths

        Args:
            data_file_path (str): location of the spreadsheet file
            sheet_name (str): name of the sheet being used. for csv files, name of the file.
            yaml_file_path (str): location of the yaml file describing the region and template
            wikifier_filepath (str): location of the wikifier file used to create the item table

        Returns:
            KnowledgeGraph: an initialized KnowledgeGraph instance
        """
        
        wikifier = Wikifier()
        wikifier.add_file(wikifier_filepath)
        cell_mapper = YamlMapper(yaml_file_path)
        sheet = Sheet(data_file_path, sheet_name)
        return cls.generate(cell_mapper, sheet, wikifier)

    def get_output(self, filetype: str):
        """returns json, kgtk, or ttl output of the KnowledgeGraph statements, in a string

        Args:
            filetype (str): accepts "json", "tsv" (or "kgtk"), "ttl"

        Returns:
            data (str): json, kgtk, or ttl output from statements
        """
        data = get_file_output_from_statements(self, filetype)
        return data

    def save_file(self, output_filename: str, filetype: str):
        """save json, kgtk, or ttl output to a file

        Args:
            output_filename (str): location to save output
            filetype (str): accepts "json", "tsv" (or "kgtk"), "ttl"
        """
        download_data = self.get_output(filetype)
        with open(output_filename, 'w') as f:
            f.write(download_data)

    def save_json(self, output_filename: str):
        """save json-format output to file

        Args:
            output_filename (str): location to save output
        """
        self.save_file(output_filename, "json")

    def save_kgtk(self, output_filename: str):
        """save kgtk-format output to file

        Args:
            output_filename (str): location to save output
        """
        self.save_file(output_filename, "tsv")

    def save_ttl(self, output_filename: str):
        """save ttl-format output to file

        Args:
            output_filename (str): location to save output
        """
        self.save_file(output_filename, "ttl")


def create_output_from_files(data_file_path:str, sheet_name:str, yaml_file_path:str, wikifier_filepath:str, output_filepath:str =None, output_format:str ="json"):
    """A convenience function for creating output from files and saving to an output file.
    Equivalent to calling KnowledgeGraph.generate_from_files followed by one of the KnowledgeGraph save functions
    But also returns to data generated for saving, so user can examine/process it (same as KnowledgeGraph.get_output)

    Args:
        data_file_path (str): location of the spreadsheet file
        sheet_name (str): name of the sheet being used. for csv files, name of the file
        yaml_file_path (str): location of the yaml file describing the region and template
        wikifier_filepath (str): location of the wikifier file used to create the item table
        output_filename (str, optional): location to save output. Defaults to None.
        filetype (str, optional): accepts "json", "tsv" (or "kgtk"), "ttl". Defaults to "json".

    Returns:
        str: string of the output data in the [filetype] format
    """
    kg = KnowledgeGraph.generate_from_files(
        data_file_path, sheet_name, yaml_file_path, wikifier_filepath)
    output = kg.get_output(output_format)
    if output_filepath:
        with open(output_filepath, 'w') as f:
            f.write(output)
    return output
