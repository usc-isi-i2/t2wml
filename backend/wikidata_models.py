from app_config import db
from datetime import datetime

# class WikidataPropertiesUpdated(db.Model):
#     timestamp = db.Column(db.DateTime, nullable=True)

#     @staticmethod
#     def update_time():
#         entry=WikidataPropertiesUpdated.query.first()
#         if entry is None:
#             entry=WikidataPropertiesUpdated()
#         entry.timestamp = datetime.utcnow()
#         db.session.commit()

class WikidataEntity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    wd_id = db.Column(db.String(64), index=True)
    data_type = db.Column(db.String(64))
    label = db.Column(db.String(64))
    description = db.Column(db.String(200))
    P31 = db.Column(db.String(64))
    cache_id = db.Column(db.String(300), nullable=True)

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

