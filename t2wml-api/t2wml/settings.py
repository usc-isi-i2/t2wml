from pathlib import Path

DEFAULT_SPARQL_ENDPOINT ='https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'# 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'#

t2wml_settings={
    "cache_data_files":False,
    "sparql_endpoint": DEFAULT_SPARQL_ENDPOINT,
    "wikidata_provider": None, #default is SparqlProvider
    "storage_folder": (Path.cwd() / "storage")
    }
