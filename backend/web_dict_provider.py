
import json
from pathlib import Path
from t2wml.api import add_entities_from_file
from t2wml.wikification.preloaded_properties import preloaded_properties
from t2wml.wikification.wikidata_provider import FallbackSparql
from app_config import DEFAULT_SPARQL_ENDPOINT, web_logger

def add_entities_from_project(project):
    for f in project.entity_files:
        add_entities_from_file(Path(project.directory) / f)

class WebDictionaryProvider(FallbackSparql):
    def __init__(self, project=None):
        web_logger.debug("initializing WebDictionary provider with project", project)
        super().__init__()
        web_logger.debug("setting cache to preloaded properties")
        self.cache=preloaded_properties
        try:
            web_logger.debug("trying to get p585")
            prop = self.try_get_property_type("P585")
            web_logger.debug("Success!", prop)
        except Exception as e:
            web_logger.debug("failed to get p585", str(e))
        self.project = project
        self.sparql_endpoint=DEFAULT_SPARQL_ENDPOINT
        if project:
            web_logger.debug("loading project entities")
            self.sparql_endpoint=project.sparql_endpoint
            add_entities_from_project(project)
            with open(project.entity_file, 'r') as f:
                self.cache.update(json.load(f))
            try:
                prop = web_logger.debug("trying to get p585")
                self.try_get_property_type("P585")
                web_logger.debug("Success!", prop)
            except Exception as e:
                web_logger.debug("failed to get p585", str(e))

    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        web_logger.debug("entered try get property type for ", wikidata_property)
        property_dict=self.cache.get(wikidata_property, None)
        if not property_dict:
            web_logger.debug("failed to get property dict")
            raise ValueError("Property not founds")

        data_type= property_dict.get("data_type", None)
        if not data_type:
            web_logger.debug("failed to get data type from property dict")
            raise ValueError("No datatype defined for that id")
        if data_type == "Property Not Found":
            web_logger.warn("property data type is Property Not Found")
        else:
            web_logger.debug("sucess, returning data type ", data_type)
        return data_type

    def get_entity(self, wikidata_property, *args, **kwargs):
        web_logger.debug("entered get entity for ", wikidata_property)
        try:
            property_dict=self.cache[wikidata_property]
            web_logger.debug("success, returning for ", wikidata_property)
            return property_dict
        except KeyError:
            web_logger.debug("failure, raising for ", wikidata_property)
            raise ValueError(wikidata_property+" not found")

    def save_entry(self, id, data_type=None, *args, **kwargs):
        web_logger.debug("entered get entity for ", id, data_type)
        added=True
        if id in self.cache:
            added=False
        self.cache[id]=dict(kwargs)
        if data_type:
            self.cache[id]["data_type"]=data_type
        return added

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        web_logger.debug("entered web dict provider __exit__ function")
        if self.project is not None:
            properties=json.dumps(self.cache)
            with open(self.project.entity_file, 'w') as f:
                f.write(properties)
