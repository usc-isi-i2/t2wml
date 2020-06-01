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


class WikidataItem(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    wd_id = db.Column(db.String(64))
    label = db.Column(db.String(300))
    description = db.Column(db.String(1000))

    @staticmethod
    def add(wd_id, label, desc):
        wi=WikidataItem(wd_id=wd_id, label=label, description=desc)
        db.session.add(wi)
        db.session.commit()