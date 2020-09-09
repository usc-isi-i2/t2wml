from app_config import db
from t2wml.wikification.wikidata_provider import FallbackSparql

class WikidataEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    wd_id = db.Column(db.String(64), index=True)
    data_type = db.Column(db.String(64))
    label = db.Column(db.String(64))
    description = db.Column(db.String(200))
    P31 = db.Column(db.String(64))

    @staticmethod
    def add_or_update(wd_id, data_type=None, label=None, description=None, P31=None, do_session_commit=True):
        wd = WikidataEntry.query.filter_by(wd_id=wd_id).first()
        if wd:
            added = False
        else:
            wd = WikidataEntry(wd_id=wd_id)
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
    def __init__(self, sparql_endpoint):
        super().__init__(sparql_endpoint)

    def save_entry(self, wd_id, property_type, label=None, description=None, **kwargs):
        return WikidataEntry.add_or_update(wd_id, property_type, label, description, do_session_commit=False)

    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        prop = WikidataEntry.query.filter_by(wd_id=wikidata_property).first()
        if prop is None:
            raise ValueError("Not found")
        if prop.data_type is None:
            raise ValueError("No datatype defined for that ID")
        return prop.data_type

    def __exit__(self, exc_type, exc_value, exc_traceback):
        WikidataEntry.do_commit()
