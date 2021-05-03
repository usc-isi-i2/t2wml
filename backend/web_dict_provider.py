
import json
from t2wml.wikification.preloaded_properties import preloaded_properties
from t2wml.wikification.wikidata_provider import FallbackSparql

class WebDictionaryProvider(FallbackSparql):
    def __init__(self):
        super().__init__()
        self.project=None
        self.cache=preloaded_properties

    def change_project(self, project):
        self.project = project
        self.sparql_endpoint=project.sparql_endpoint
        with open(project.entity_file, 'r') as f:
            self.cache.update(json.load(f))

    def save_entry(self, wd_id, data_type, **kwargs):
        self.cache[wd_id]=dict(kwargs)
        self.cache[wd_id]["data_type"]=data_type

    def try_get_property_type(self, wikidata_property, *args, **kwargs):
            property_dict=self.cache.get(wikidata_property, None)
            if not property_dict:
                raise ValueError("Property not founds")

            data_type= property_dict.get("data_type", None)
            if not data_type:
                raise ValueError("No datatype defined for that id")
            return data_type

    def get_entity(self, wikidata_property, *args, **kwargs):
        try:
            property_dict=self.cache[wikidata_property]
            return property_dict
        except KeyError:
            raise ValueError(wikidata_property+" not found")

    def save_entry(self, property, data_type, *args, **kwargs):
        added=True
        if property in self.cache:
            added=False
        self.cache[property]=dict(kwargs)
        if data_type:
            self.cache[property]["data_type"]=data_type
        return added

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        if self.project is not None:
            properties=json.dumps(self.cache)
            with open(self.project.entity_file, 'w') as f:
                f.write(properties)

