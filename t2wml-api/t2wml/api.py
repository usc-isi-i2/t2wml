
from t2wml.settings import t2wml_settings
from t2wml.wikification.utility_functions import add_properties_from_file

from t2wml.wikification.item_table import Wikifier
from t2wml.spreadsheets.sheet import Sheet, SpreadsheetFile
from t2wml.mapping.statement_mapper import YamlMapper, StatementMapper
from t2wml.wikification.wikifier_service import WikifierService
from t2wml.wikification.wikidata_provider import SparqlProvider, DictionaryProvider, WikidataProvider
from t2wml.knowledge_graph import KnowledgeGraph, create_output_from_files
from t2wml.project import Project

def set_wikidata_provider(wp: WikidataProvider):
    """set the wikidata provider to be used by the script

    Args:
        wp (WikidataProvider): an initialized instance (not class) of soem subclass of WikidataProvider
    """
    t2wml_settings["wikidata_provider"] = wp


def set_sparql_endpoint(se: str):
    """set the sparql endpoint to be used when making sparql queries (for item or property)

    Args:
        se (str): valid sparql endpoint eg: 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'
    """
    t2wml_settings["sparql_endpoint"] = se

