from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename

from t2wml.api import add_properties_from_file, SpreadsheetFile

from app_config import DEFAULT_SPARQL_ENDPOINT, UPLOAD_FOLDER, db


def get_project_folder(project):
    return Path(UPLOAD_FOLDER)/(project.name+"_"+str(project.id))




class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), index=True)
    creation_date=db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    modification_date=db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    sparql_endpoint=db.Column(db.String(64), nullable=True, default=DEFAULT_SPARQL_ENDPOINT)
    files= db.relationship("SavedFile", back_populates="project")

    def __repr__(self):
        return '<Project {}: {}>'.format(self.name, self.id)  


    @staticmethod
    def delete(pid):
        proj=Project.query.get(pid)
        db.session.delete(proj)
        db.session.commit()

    @staticmethod
    def create(title):
        p=Project(name=title)
        db.session.add(p)
        db.session.commit()
        p.make_directories()
        return p
    
    def make_directories(self):
        project_path=get_project_folder(self)
        project_path.mkdir(parents=True, exist_ok=True)

    def modify(self):
        self.modificationdate=datetime.utcnow()
        db.session.commit()

    @property
    def current_file(self):
        #this is a temporary measure while we are only supporting a single file
        data_file=DataFile.query.filter_by(project_id=self.id).order_by(DataFile.id.desc()).first()
        if data_file:
            return data_file
    
    @property
    def wikifier_file(self):
        #this is a temporary measure while we are only supporting a single file
        current=WikifierFile.query.filter_by(project_id=self.id).order_by(WikifierFile.id.desc()).first()
        if current:
            return current

class SavedFile(db.Model):
    sub_folder=""
    id = db.Column(db.Integer, primary_key=True)
    file_path= db.Column(db.String(300))
    extension=db.Column(db.String(20))
    name= db.Column(db.String(100))
    project_id=db.Column(db.ForeignKey("project.id"))
    project=db.relationship("Project", back_populates="files")
    type=db.Column(db.String(50))


    __mapper_args__ = {
        'polymorphic_identity': 'savedfile',
        "polymorphic_on": type
    }

    @classmethod
    def get_folder(cls, project):
        sub_folder=cls.sub_folder
        folder=get_project_folder(project)/sub_folder
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    @classmethod
    def save_file(cls, project, in_file):
        folder = cls.get_folder(project)
        filename = secure_filename(in_file.filename)
        file_path = folder/filename
        in_file.save(str(file_path))
        return file_path
    
    @classmethod
    def create(cls, project, in_file):
        try:
            file_path= cls.save_file(project, in_file)
            extension= file_path.suffix
        except:
            raise IOError("Failed to save file")
        saved_file= cls(file_path=str(file_path), name=in_file.filename, project_id=project.id, extension=extension)
        db.session.add(saved_file)
        db.session.commit()
        return saved_file
    
    @classmethod
    def create_from_filepath(cls, project, file_path):
        #this function is primarily for convenience when testing the database schema
        name= Path(file_path).stem
        extension=Path(file_path).suffix
        saved_file=cls(file_path=file_path, name=name, project_id=project.id, extension=extension)
        db.session.add(saved_file)
        db.session.commit()
        return saved_file

    def __repr__(self):
        return '<File {} : {}>'.format(self.name+self.extension, self.id)

class YamlFile(SavedFile):
    __tablename__ = 'yamlfile'
    id = db.Column(db.Integer, db.ForeignKey('saved_file.id'), primary_key=True)
    sub_folder="yf"
    __mapper_args__ = {
        'polymorphic_identity':'yamlfile',
    }

    @classmethod
    def create_from_formdata(cls, project, form_data):
        #placeholder function until we start uploading yaml files properly, as files
        folder=cls.get_folder(project)
        filepath= str(folder/"1.yaml")
        with open(filepath, 'w', newline='') as f:
            f.write(form_data)
        yf=cls.create_from_filepath(project, filepath)
        return yf



class WikifierFile(SavedFile):
    __tablename__ = 'wikifierfile'
    id = db.Column(db.Integer, db.ForeignKey('saved_file.id'), primary_key=True)
    sub_folder="wf"
    __mapper_args__ = {
        'polymorphic_identity':'wikifierfile',
    }

    @classmethod
    def create_from_dataframe(cls, project, df):
        folder=cls.get_folder(project)
        filepath= str(folder/"wikify_region_output.csv")
        df.to_csv(filepath)
        wf= cls.create_from_filepath(project, filepath)
        return wf

class PropertiesFile(SavedFile):
    __tablename__ = 'propertyfile'
    id = db.Column(db.Integer, db.ForeignKey('saved_file.id'), primary_key=True)
    sub_folder="pf"
    __mapper_args__ = {
        'polymorphic_identity':'propertyfile',
    }

    @classmethod
    def create(cls, project, in_file):
        pf= super().create(project, in_file)
        return_dict= add_properties_from_file(pf.file_path)
        return return_dict
    
    @classmethod
    def create_from_filepath(cls, project, in_file):
        pf= super().create_from_filepath(project, in_file)
        return_dict=add_properties_from_file(pf.file_path)
        return return_dict


class ItemsFile(SavedFile):
    __tablename__ = 'itemfile'
    id = db.Column(db.Integer, db.ForeignKey('saved_file.id'), primary_key=True)
    sub_folder="if"
    __mapper_args__ = {
        'polymorphic_identity':'itemfile',
    }

    
     

class DataFile(SavedFile):
    __tablename__ = 'datafile'
    sub_folder="df"
    id = db.Column(db.Integer, db.ForeignKey('saved_file.id'), primary_key=True)
    current_sheet_id=db.Column(db.Integer())
    sheets=db.relationship("DataSheet", back_populates="data_file")
    wikifiles=db.relationship('WikifierFile', 
    secondary="datafile_wiki", lazy='subquery', backref=db.backref('datafiles', lazy=True))
    __mapper_args__ = {
        'polymorphic_identity':'datafile',
    }

    @classmethod
    def create_from_filepath(cls, project, in_file):
        df = super().create_from_filepath(project, in_file) #cls.create(project, in_file)
        df.init_sheets()
        return df
    
    @classmethod
    def create(cls, project, in_file):
        df = super().create(project, in_file)
        df.init_sheets()
        return df
    
    
    def init_sheets(self):
        spreadsheet=SpreadsheetFile(self.file_path)
        for sheet_name in spreadsheet:
            ps = DataSheet(name=sheet_name, data_file_id=self.id)
            db.session.add(ps)
        self.current_sheet_id=self.sheets[0].id
        db.session.commit()
    
    @property
    def current_sheet(self):
        return DataSheet.query.get(self.current_sheet_id)

    def change_sheet(self, sheet_name):
        newcurrsheet=DataSheet.query.filter_by(name=sheet_name, data_file_id=self.id).order_by(DataSheet.id.desc()).first()
        if newcurrsheet:
            self.current_sheet_id=newcurrsheet.id
            db.session.commit()
        else:
            raise ValueError("No such sheet")
class DataSheet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64))
    data_file_id=db.Column(db.Integer, db.ForeignKey('datafile.id'))
    data_file=db.relationship("DataFile", back_populates="sheets")
    yamlfiles=db.relationship('YamlFile', 
    secondary="yaml_sheet", lazy='subquery', backref=db.backref('sheets', lazy=True))

    @property
    def yaml_file(self):
        #a temporary function while we are still supporting single files only
        if len(self.yamlfiles):
            return self.yamlfiles[-1]
        return None

yaml_sheet=db.Table('yaml_sheet',
    db.Column('sheet_id', db.Integer, db.ForeignKey('data_sheet.id')),
    db.Column('yaml_id', db.Integer, db.ForeignKey('yamlfile.id'))
)


datafile_wiki=db.Table('datafile_wiki',
    db.Column('wikifier_id', db.Integer, db.ForeignKey('wikifierfile.id')),
    db.Column('data_file_id', db.Integer, db.ForeignKey('datafile.id'))
)
