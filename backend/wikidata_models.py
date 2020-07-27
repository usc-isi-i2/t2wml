from sqlalchemy.exc import IntegrityError
from app_config import db

class ValueAlreadyPresentError(ValueError):
    pass

class WikidataProperty(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    wd_id = db.Column(db.String(64), index=True)
    property_type= db.Column(db.String(64))
    label= db.Column(db.String(64))
    description= db.Column(db.String(200))

    @staticmethod
    def add(wikidata_property, property_type, label=None, description=None):
        wp=WikidataProperty(wd_id=wikidata_property, property_type=property_type)
        if label is not None:
            wp.label=label
        if description is not None:
            wp.description=description
        try:
            db.session.add(wp)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueAlreadyPresentError

    @staticmethod
    def add_or_update(wikidata_property, property_type, label=None, description=None, do_session_commit=True):
        wp= WikidataProperty.query.filter_by(wd_id=wikidata_property).first()
        if wp:
            wp.property_type=property_type
            added=False
        else:
            wp=WikidataProperty(wd_id=wikidata_property, property_type=property_type)
            db.session.add(wp)
            added=True
        
        if label is not None:
            wp.label=label
        if description is not None:
            wp.description=description

        if do_session_commit:
            db.session.commit()
        return added

class WikidataItem(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    wd_id = db.Column(db.String(64), index=True)
    label = db.Column(db.String(300))
    description = db.Column(db.String(1000))

    @staticmethod
    def add(wd_id, label, description):
        wi=WikidataItem(wd_id=wd_id, label=label, description=description)
        db.session.add(wi)
        db.session.commit()
    
    @staticmethod
    def add_or_update(wd_id, label=None, description=None, do_session_commit=True):
        wi= WikidataItem.query.filter_by(wd_id=wd_id).first()
        if wi:
            added=False
        else:
            wi=WikidataItem(wd_id=wd_id)
            db.session.add(wi)
            added=True
        if label:
            wi.label=label
        if description:
            wi.description=description
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



from t2wml.wikification.wikidata_provider import FallbackSparql

class DatabaseProvider(FallbackSparql):
    def __init__(self, sparql_endpoint):
        super().__init__(sparql_endpoint)
    
    def save_property(self, wd_property, property_type, label=None, description=None):
        return WikidataProperty.add_or_update(wd_property, property_type, label, description, do_session_commit=False)
    
    def save_item(self, item_id, item_dict):
        WikidataItem.add(item_id, item_dict['label'], item_dict['desc'])
    
    def try_get_property_type(self, wikidata_property, *args, **kwargs):
        prop = WikidataProperty.query.filter_by(wd_id=wikidata_property).first()
        if prop is None:
            raise ValueError("Not found")
        return prop.property_type
    
    def try_get_item(self, item, *args, **kwargs):
        wdi= WikidataItem.query.filter_by(wd_id=item).first()
        return  {'label': wdi.label, 'desc': wdi.description}
    
    def __exit__(self, exc_type, exc_value, exc_traceback):
        try:
            db.session.commit()
        except:
            db.session.rollback()
            raise ValueError("Failed to commit to database session")