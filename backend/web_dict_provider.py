
import json
from pathlib import Path
from t2wml.api import add_entities_from_file
from t2wml.wikification.preloaded_properties import preloaded_properties
from t2wml.wikification.wikidata_provider import FallbackSparql
from causx.country_entities import country_entities
from app_config import DEFAULT_SPARQL_ENDPOINT


def add_entities_from_project(project):
    for f in project.entity_files:
        add_entities_from_file(Path(project.directory) / f)

class WebDictionaryProvider(FallbackSparql):
    def __init__(self, project=None):
        super().__init__()
        self.project = project
        self.sparql_endpoint=DEFAULT_SPARQL_ENDPOINT
        if project:
            self.sparql_endpoint=project.sparql_endpoint
            with open(project.entity_file, 'r') as f:
                file_cache = json.load(f)
                self.cache.update(file_cache)

    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        try:
            property_dict=self.cache[wikidata_property]
            property_dict["data_type"]
            if property_dict["data_type"]=="Property Not Found":
                raise KeyError
        except KeyError:
            property_dict=preloaded_properties[wikidata_property]
            if not property_dict:
                raise ValueError("Property not found")

        data_type= property_dict.get("data_type", None)
        if not data_type:
            raise ValueError("No datatype defined for that id")
        return data_type

    def get_entity(self, wikidata_property, *args, **kwargs):
        if wikidata_property in preloaded_properties:
            property_dict = preloaded_properties[wikidata_property]
            user_dict = self.cache.get(wikidata_property, {}) #a workaround for as long as we support tags on wikidata properties...
            property_dict.update(user_dict)
            return property_dict
        if wikidata_property in country_entities:
            return country_entities[wikidata_property]
        try:
            property_dict=self.cache[wikidata_property]
            return property_dict
        except KeyError:
            raise ValueError(wikidata_property+" not found")

    def save_entry(self, node_id, data_type=None, *args, **kwargs):
        added=True
        if node_id in self.cache:
            added=False
        self.cache[node_id]=dict(kwargs)
        if data_type:
            self.cache[node_id]["data_type"]=data_type
        return added

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        if self.project is not None:
            properties=json.dumps(self.cache)
            with open(self.project.entity_file, 'w') as f:
                f.write(properties)
