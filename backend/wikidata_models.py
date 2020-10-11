from uuid import uuid4
from app_config import db
from t2wml.wikification.wikidata_provider import FallbackSparql
from SPARQLWrapper import SPARQLWrapper, JSON


class WikidataEntity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    wd_id = db.Column(db.String(64), index=True)
    data_type = db.Column(db.String(64))
    label = db.Column(db.String(64))
    description = db.Column(db.String(200))
    P31 = db.Column(db.String(64))
    cache_id = db.Column(db.String(64), nullable=True)

    @staticmethod
    def add_or_update(wd_id, data_type=None, label=None, description=None, P31=None, cache_id=None,
                      do_session_commit=True, **kwargs):
        wd = WikidataEntity.query.filter_by(wd_id=wd_id, cache_id=cache_id).first()
        if wd:
            added = False
        else:
            wd = WikidataEntity(wd_id=wd_id, cache_id=cache_id)
            added = True

        if data_type is not None:
            wd.data_type = data_type
        if label is not None:
            wd.label = label
        if description is not None:
            wd.description = description
        if P31 is not None:
            wd.P31 = P31

        db.session.add(wd)
        if do_session_commit:
            db.session.commit()
        return added

    @staticmethod
    def do_commit():
        try:
            db.session.commit()
        except:
            db.session.rollback()
            raise ValueError("Failed to commit to database session")


class DatabaseProvider(FallbackSparql):
    def __init__(self, project):
        self.project = project

        if self.project.cache_id:
            self.cache_id = self.project.cache_id
        else:
            self.cache_id = self.project.cache_id = str(uuid4())
            project.save()

        super().__init__(project.sparql_endpoint)

    def save_entry(self, wd_id, data_type, from_file=False, **kwargs):
        cache_id = None
        if from_file:
            cache_id = self.cache_id
        return WikidataEntity.add_or_update(wd_id, data_type, do_session_commit=False, cache_id=cache_id, **kwargs)

    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        #check for project-specific first
        prop = WikidataEntity.query.filter_by(wd_id=wikidata_property, cache_id=self.cache_id).first()
        #check for generic wikidata entry
        if not prop or prop.data_type is None or prop.data_type == "Property Not Found":
            prop = WikidataEntity.query.filter_by(wd_id=wikidata_property, cache_id=None).first()
        if not prop or prop.data_type == "Property Not Found":
            raise ValueError("Not found")
        if prop.data_type is None:
            raise ValueError("No datatype defined for that ID")
        return prop.data_type

    def __exit__(self, exc_type, exc_value, exc_traceback):
        WikidataEntity.do_commit()


wikidata_label_query_cache = {}


def query_wikidata_for_label_and_description(items, sparql_endpoint):
    items = ' wd:'.join(items)
    items = "wd:" + items

    query = """PREFIX wd: <http://www.wikidata.org/entity/>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                SELECT ?qnode (MIN(?label) AS ?label) (MIN(?desc) AS ?desc) WHERE { 
                VALUES ?qnode {""" + items + """} 
                ?qnode rdfs:label ?label; <http://schema.org/description> ?desc.
                FILTER (langMatches(lang(?label),"EN"))
                FILTER (langMatches(lang(?desc),"EN"))
                }
                GROUP BY ?qnode"""
    sparql = SPARQLWrapper(sparql_endpoint)
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
    except Exception as e:
        raise e
    response = dict()
    try:
        for i in range(len(results["results"]["bindings"])):
            qnode = results["results"]["bindings"][i]["qnode"]["value"].split(
                "/")[-1]
            label = results["results"]["bindings"][i]["label"]["value"]
            desc = results["results"]["bindings"][i]["desc"]["value"]
            response[qnode] = {'label': label, 'description': desc}
    except IndexError:
        pass
    return response


def get_labels_and_descriptions(items, sparql_endpoint):
    response = dict()
    missing_items = []
    for item in items:
        wp = WikidataEntity.query.filter_by(wd_id=item).first()
        if wp:
            label = desc = ""
            if wp.label:
                label = wp.label
                if wp.description:
                    desc = wp.description
                response[item] = dict(label=label, description=desc)
            else:
                missing_items.append(item)
        else:
            missing_items.append(item)
    try:
        if missing_items:
            additional_items = query_wikidata_for_label_and_description(
                missing_items, sparql_endpoint)
            response.update(additional_items)
            try:
                for item in additional_items:
                    WikidataEntity.add_or_update(item, do_session_commit=False, **additional_items[item])
            except Exception as e:
                print(e)
            WikidataEntity.do_commit()

    except:  # eg 502 bad gateway error
        pass
    return response