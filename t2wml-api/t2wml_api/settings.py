from t2wml_api.wikification.wikidata_provider import SparqlProvider

DEFAULT_SPARQL_ENDPOINT = 'https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql'

t2wml_settings={
    "use_cache":False,
    "sparql_endpoint": DEFAULT_SPARQL_ENDPOINT,
    "wikidata_provider": SparqlProvider(DEFAULT_SPARQL_ENDPOINT)
}
