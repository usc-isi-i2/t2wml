import logging
import json
from t2wml.wikification.preloaded_properties import preloaded_properties
from t2wml.wikification.wikidata_provider import FallbackSparql

class WebDictionaryProvider(FallbackSparql):
    def __init__(self):
        logging.debug("enter wdb init")
        super().__init__()
        self.project=None
        self.cache=preloaded_properties
        logging.debug("exit wdb init")

    def change_project(self, project):
        logging.debug("enter wdb change project")
        self.project = project
        self.sparql_endpoint=project.sparql_endpoint
        with open(project.entity_file, 'r') as f:
            self.cache.update(json.load(f))
        logging.debug("exit wdb change project")

    def save_entry(self, wd_id, data_type, **kwargs):
        logging.debug("enter wdb save entry")
        self.cache[wd_id]=dict(kwargs)
        self.cache[wd_id]["data_type"]=data_type
        logging.debug("exit wdb save entry")

    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        logging.debug("enter wdb try get property type")
        property_dict=self.cache.get(wikidata_property, None)
        if not property_dict:
            logging.debug("raise wdb try get property type")
            raise ValueError("Property not founds")

        data_type= property_dict.get("data_type", None)
        if not data_type:
            logging.debug("raise wdb try get property type")
            raise ValueError("No datatype defined for that id")
        logging.debug("return wdb try get property type")
        return data_type

    def get_entity(self, wikidata_property, *args, **kwargs):
        logging.debug("enter wdb get_entity")
        try:
            property_dict=self.cache[wikidata_property]
            logging.debug("return wdb get_entity")
            return property_dict
        except KeyError:
            logging.debug("raise wdb get_entity")
            raise ValueError(wikidata_property+" not found")

    def save_entry(self, property, data_type, *args, **kwargs):
        logging.debug("enter wdb save_entry")
        added=True
        if property in self.cache:
            added=False
        self.cache[property]=dict(kwargs)
        if data_type:
            self.cache[property]["data_type"]=data_type
        logging.debug("return wdb save_entry")
        return added

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        logging.debug("enter wdb __exit__")
        if self.project is not None:
            properties=json.dumps(self.cache)
            with open(self.project.entity_file, 'w') as f:
                f.write(properties)
        logging.debug("exit wdb __exit__")

