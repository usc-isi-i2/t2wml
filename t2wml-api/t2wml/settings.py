from pathlib import Path

DEFAULT_SPARQL_ENDPOINT = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'

wikidata_provider = None
sparql_endpoint=DEFAULT_SPARQL_ENDPOINT


t2wml_settings={
    "cache_data_files":False,
    "cache_results":False,
    "sparql_endpoint": DEFAULT_SPARQL_ENDPOINT,
    "wikidata_provider": None, #default is SparqlProvider
    "storage_folder": (Path.cwd() / "storage")
    }
