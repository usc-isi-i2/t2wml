from abc import ABC, abstractmethod
from SPARQLWrapper import SPARQLWrapper, JSON
from t2wml.settings import t2wml_settings


class WikidataProvider(ABC):
    @abstractmethod
    def get_property_type(self, wikidata_property, *args, **kwargs):
        raise NotImplementedError

    def save_property(self, property, property_type, *args, **kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        pass


class SparqlProvider(WikidataProvider):
    '''
    Provides responses to queries purely from sparql. 
    Will fail if item/property not in wikidata
    '''

    def __init__(self, sparql_endpoint:str=None, *args, **kwargs):
        """[summary]
        Args:
            sparql_endpoint (str, optional): [description]. Defaults to None.
            If None, the sparql endpoint from t2wml_settings is used.
        """
        if sparql_endpoint is None:
            sparql_endpoint = t2wml_settings["sparql_endpoint"]
        self.sparql_endpoint = sparql_endpoint
        self.cache = {}

    def query_wikidata_for_property_type(self, wikidata_property):
        query = """SELECT ?type WHERE {
                    wd:""" + wikidata_property + """ rdf:type wikibase:Property ;
                    wikibase:propertyType ?type .
                }"""
        sparql = SPARQLWrapper(self.sparql_endpoint)
        sparql.setQuery(query)
        sparql.setReturnFormat(JSON)
        results = sparql.query().convert()
        try:
            property_type = results["results"]["bindings"][0]["type"]["value"].split("#")[
                1]
        except IndexError:
            property_type = "Property Not Found"
        return property_type

    def get_property_type(self, wikidata_property: str):
        property_type = self.cache.get(wikidata_property, False)
        if not property_type:
            property_type = self.query_wikidata_for_property_type(
                wikidata_property)
            self.save_property(wikidata_property, property_type)
            if property_type == "Property Not Found":
                raise ValueError("Property "+wikidata_property+" not found")

        return property_type

    def save_property(self, property, property_type, *args, **kwargs):
        self.cache[property] = property_type


class FallbackSparql(SparqlProvider):
    '''
    A class for querying some source, and if the source does not have a response to the query, 
    falling back to sparql queries (and then optionally saving query response to the main source)
    '''

    def get_property_type(self, wikidata_property, *args, **kwargs):
        try:
            property_type = self.try_get_property_type(
                wikidata_property, *args, **kwargs)
        except:
            property_type = super().get_property_type(wikidata_property)
        return property_type

    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        raise NotImplementedError


class DictionaryProvider(SparqlProvider):
    def __init__(self, ref_dict, sparql_endpoint=None, *args, **kwargs):
        super().__init__(sparql_endpoint)
        self.cache = ref_dict
