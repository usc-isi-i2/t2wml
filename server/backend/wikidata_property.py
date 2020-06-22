from sqlalchemy.exc import IntegrityError
from app_config import db
#for reasons of circular import problems, this model needed to be placed by itself for now


class ValueAlreadyPresentError(ValueError):
    pass

class WikidataProperty(db.Model):
    wikidata_property = db.Column(db.String(64), primary_key=True)
    property_type= db.Column(db.String(64))

    @staticmethod
    def add(wikidata_property, property_type):
        wp=WikidataProperty(wikidata_property=wikidata_property, property_type=property_type)
        try:
            db.session.add(wp)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueAlreadyPresentError

    @staticmethod
    def add_or_update(wikidata_property, property_type, do_session_commit=True):
        wp= WikidataProperty.query.get(wikidata_property)
        if wp:
            wp.property_type=property_type
            added=False
        else:
            wp=WikidataProperty(wikidata_property=wikidata_property, property_type=property_type)
            db.session.add(wp)
            added=True
        if do_session_commit:
            db.session.commit()
        return added





class WikidataItem(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    wd_id = db.Column(db.String(64))
    label = db.Column(db.String(300))
    description = db.Column(db.String(1000))

    @staticmethod
    def add(wd_id, label, desc, do_session_commit=True):
        wi=WikidataItem(wd_id=wd_id, label=label, description=desc)
        db.session.add(wi)
        if do_session_commit:
            db.session.commit()


from t2wml_api.wikification.wikidata_provider import FallbackSparql

class DatabaseProvider(FallbackSparql):
    def __init__(self, sparql_endpoint):
        super().__init__(sparql_endpoint)
    
    def save_property(self, wd_property, property_type):
        return WikidataProperty.add_or_update(wd_property, property_type, do_session_commit=False)
    
    def save_item(self, item_id, item_dict):
        WikidataItem.add(item_id, item_dict['label'], item_dict['desc'], do_session_commit=False)
    
    def __exit__(self, exc_type, exc_value, exc_traceback):
        try:
            db.session.commit()
        except:
            db.session.rollback()
            raise ValueError("Failed to commit to database session")
