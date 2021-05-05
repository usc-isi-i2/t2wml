from t2wml.wikification.wikidata_provider import FallbackSparql
from uuid import uuid4
from wikidata_models import WikidataEntity

class DatabaseProvider(FallbackSparql):
    def __init__(self):
        super().__init__()
        self.cache_id=None
        self.project=None
        self.property_cache={}

    def change_project(self, project):
        self.project = project

        if self.project.cache_id:
            self.cache_id = self.project.cache_id
        else:
            self.cache_id = self.project.cache_id = str(uuid4())
            project.save()

        self.sparql_endpoint=project.sparql_endpoint

    def save_entry(self, wd_id, data_type, from_file=False, **kwargs):
        cache_id = self.sparql_endpoint
        if from_file:
            cache_id = self.cache_id
        return WikidataEntity.add_or_update(wd_id, data_type, do_session_commit=False, cache_id=cache_id, **kwargs)

    def get_entity(self, wikidata_property, *args, **kwargs):
        prop=self.property_cache.get(wikidata_property, None)
        if not prop:
            #check for project-specific first
            prop = WikidataEntity.query.filter_by(wd_id=wikidata_property, cache_id=self.cache_id).first()
            #check for generic wikidata entry
            if not prop:
                prop = WikidataEntity.query.filter_by(wd_id=wikidata_property, cache_id=self.sparql_endpoint).first()
            if not prop:
                raise ValueError("Not found")
        self.property_cache[wikidata_property]=prop
        return prop.__dict__


    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        prop=self.property_cache.get(wikidata_property, None)
        if not prop:
            #check for project-specific first
            prop = WikidataEntity.query.filter_by(wd_id=wikidata_property, cache_id=self.cache_id).first()
            #check for generic wikidata entry
            if not prop or prop.data_type is None or prop.data_type == "Property Not Found":
                prop = WikidataEntity.query.filter_by(wd_id=wikidata_property, cache_id=self.sparql_endpoint).first()
            if not prop:
                raise ValueError("Not found")
        if prop.data_type == "Property Not Found":
            return prop.data_type
        if prop.data_type is None:
            raise ValueError("No datatype defined for that ID")
        self.property_cache[wikidata_property]=prop
        return prop.data_type

    def __exit__(self, exc_type, exc_value, exc_traceback):
        WikidataEntity.do_commit()

