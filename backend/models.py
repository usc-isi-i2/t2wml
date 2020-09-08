import os
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename
from t2wml.api import SpreadsheetFile, add_nodes_from_file
from t2wml.api import Project as apiProject
from app_config import DEFAULT_SPARQL_ENDPOINT, UPLOAD_FOLDER, db


def get_project_folder(project, new_name=None):
    name=new_name
    if not name:
        name=project.name
    p= Path(UPLOAD_FOLDER)/(name+"_"+str(project.id))
    return p

def default_project_folder(context):
    params=context.get_current_parameters()
    id=params['id']
    name=params['name']
    return str(Path(UPLOAD_FOLDER)/(name+"_"+str(id)))

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), index=True)
    creation_date = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow)
    modification_date = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow)
    sparql_endpoint = db.Column(
        db.String(64), nullable=True, default=DEFAULT_SPARQL_ENDPOINT)
    warn_for_empty_cells=db.Column(db.Boolean, default=False)
    file_directory=db.Column(db.String(300), nullable=True)
    files = db.relationship("SavedFile", back_populates="project")


    def __repr__(self):
        return '<Project {}: {}>'.format(self.name, self.id)

    def rename(self, new_name):
        self.name=new_name
        self.modify()
        self.api_project.title=new_name
        self.api_project.save()

    @property
    def directory(self):
        return self.file_directory

    @staticmethod
    def delete(pid):
        proj = Project.query.get(pid)
        db.session.delete(proj)
        db.session.commit()

    @staticmethod
    def create(title):
        p = Project(name=title)
        db.session.add(p)
        db.session.commit()
        p.make_directories()
        return p

    def make_directories(self):
        project_path = get_project_folder(self)
        project_path.mkdir(parents=True, exist_ok=True)

    def modify(self):
        self.modificationdate = datetime.utcnow()
        db.session.commit()

    @property
    def current_file(self):
        # this is a temporary measure while we are only supporting a single file
        data_file = DataFile.query.filter_by(
            project_id=self.id).order_by(DataFile.id.desc()).first()
        if data_file:
            return data_file

    @property
    def wikifier_file(self):
        # this is a temporary measure while we are only supporting a single file
        current = WikifierFile.query.filter_by(
            project_id=self.id).order_by(WikifierFile.id.desc()).first()
        if current:
            return current
    
    @staticmethod
    def load(api_proj):
        name=api_proj.title
        file_directory=api_proj.directory
        sparql_endpoint=api_proj.sparql_endpoint
        warn_for_empty_cells=api_proj.warn_for_empty_cells
        project=Project(name=name, file_directory=file_directory, sparql_endpoint=sparql_endpoint,  warn_for_empty_cells=warn_for_empty_cells)

        if len(api_proj.data_files)>1:
            print("WARNING: projects with more than one data file not yet supported. will use last-added data file")
        if len(api_proj.wikifier_files)>1:
            print("WARNING: projects with more than one wikifier file not yet supported. will use last-added data file")
        if len(api_proj.specific_wikifiers):
            print("WARNING: specific wikifiers not yet supported, will be ignored")
            
        db.session.add(project)
        db.session.commit()
        
        for f in api_proj.data_files:
            df=DataFile.create_from_filepath(project, os.path.join(api_proj.directory, f), from_api_proj=True)
            if f in api_proj.yaml_sheet_associations:
                assocs=api_proj.yaml_sheet_associations[f]
                for sheet in df.sheets:
                    yamls=assocs.get(sheet.name, [])
                    if len(yamls)>1:
                        print("Detected multiple yaml files in project. Only the last yaml file will be used")
                    for y in yamls:
                        yf=YamlFile.create_from_filepath(project, os.path.join(api_proj.directory, y), sheet, from_api_proj=True)
                        sheet.yamlfiles.append(yf)
        
        for f in api_proj.wikifier_files:
            wf=WikifierFile.create_from_filepath(project, os.path.join(api_proj.directory, f), from_api_proj=True)

        for f in api_proj.wikidata_files:
            pf=PropertiesFile.create_from_filepath(project, os.path.join(api_proj.directory, f), from_api_proj=True)
            add_nodes_from_file(pf.file_path)
        return project

    def create_project_file(self):
        proj=apiProject(self.directory, self.name, sparql_endpoint=self.sparql_endpoint, warn_for_empty_cells=self.warn_for_empty_cells)
        if self.current_file:
            proj.add_data_file(self.current_file.relative_path)
            for sheet in self.current_file.sheets:
                if sheet.yaml_file:
                    proj.add_yaml_file(sheet.yaml_file.relative_path, self.current_file.relative_path, sheet.name)
        
        if self.wikifier_file:
            proj.add_wikifier_file(self.wikifier_file.relative_path)

        property_files=PropertiesFile.query.filter_by(project_id=self.id)
        for p_f in property_files:
            proj.add_wikidata_file(p_f.relative_path)

        item_files=ItemsFile.query.filter_by(project_id=self.id)
        for i_f in item_files:
            proj.add_wikidata_file(i_f.relative_path)
        
        proj.save()
        return proj
    
    
    @property
    def api_project(self):
        try:
            return self._api_proj
        except AttributeError:
            self._api_proj=self.create_project_file()
            return self._api_proj
    
    @staticmethod
    def get(pid):
        project = Project.query.get(pid)
        if not project:
            raise ValueError("Not found")
        if project.file_directory is None:
            p = get_project_folder(project)
            if not p.is_dir():
                raise ValueError("Project directory was never created")
            #save for the future
            project.file_directory=str(p)
            db.session.commit()
        project.create_project_file()
        return project
    
    def update_settings(self, settings):
        endpoint = settings.get("endpoint", None)
        if endpoint:
            self.sparql_endpoint = endpoint
        warn = settings.get("warnEmpty", None)
        if warn is not None:
            self.warn_for_empty_cells=warn.lower()=='true'
        self.create_project_file()
        self.api_project.save()
        self.modify()

class SavedFile(db.Model):
    sub_folder = ""
    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String(300))
    extension = db.Column(db.String(20))
    name = db.Column(db.String(100))
    project_id = db.Column(db.ForeignKey("project.id"))
    project = db.relationship("Project", back_populates="files")
    type = db.Column(db.String(50))

    __mapper_args__ = {
        'polymorphic_identity': 'savedfile',
        "polymorphic_on": type
    }

    @classmethod
    def get_folder(cls, project):
        sub_folder = cls.sub_folder
        folder =Path(project.directory)
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    @classmethod
    def save_file(cls, project, in_file):
        folder = cls.get_folder(project)
        shorter_name=Path(in_file.filename).name #otherwise secure_filename does weird things on linux
        filename = secure_filename(shorter_name)
        file_path = folder/filename
        in_file.save(str(file_path))
        return file_path

    @classmethod
    def create(cls, project, in_file):
        try:
            file_path = cls.save_file(project, in_file)
            extension = file_path.suffix
        except:
            raise IOError("Failed to save file")
        saved_file = cls(file_path=str(file_path), name=in_file.filename,
                         project_id=project.id, extension=extension)
        db.session.add(saved_file)
        db.session.commit()
        saved_file.add_to_api_proj()
        return saved_file

    @classmethod
    def create_from_filepath(cls, project, file_path, from_api_proj=False):
        name = Path(file_path).stem
        extension = Path(file_path).suffix
        saved_file = cls(file_path=file_path, name=name,
                         project_id=project.id, extension=extension)
        db.session.add(saved_file)
        db.session.commit()
        if not from_api_proj:
            saved_file.add_to_api_proj()
        return saved_file

    def add_to_api_proj(self):
        raise NotImplementedError

    def __repr__(self):
        return '<File {} : {}>'.format(self.name + self.extension, self.id)

    @property
    def relative_path(self):
        parent=Path(self.project.directory)
        child=Path(self.file_path)
        relative_path=str(child.relative_to(parent))
        return relative_path

class YamlFile(SavedFile):
    __tablename__ = 'yamlfile'
    id = db.Column(db.Integer, db.ForeignKey(
        'saved_file.id'), primary_key=True)
    sub_folder = "yf"
    __mapper_args__ = {
        'polymorphic_identity': 'yamlfile',
    }

    @classmethod
    def create_from_formdata(cls, project, form_data, title, sheet):
        # placeholder function until we start uploading yaml files properly, as files
        yf = YamlFile(project_id=project.id)
        db.session.add(yf)
        db.session.commit()

        folder = cls.get_folder(project)
        if not title:
            title=sheet.name+".yaml"
        file_path = str(folder /  title)
        with open(file_path, 'w', newline='', encoding="utf-8") as f:
            f.write(form_data)
        name = Path(file_path).stem
        extension = Path(file_path).suffix
        yf.file_path = file_path
        yf.extension = extension
        yf.name = name
        yf.add_to_api_proj(sheet)
        sheet.yamlfiles.append(yf)
        project.modify()
        return yf
    
    @classmethod
    def create_from_filepath(cls, project, file_path, sheet, from_api_proj=False):
        name = Path(file_path).stem
        extension = Path(file_path).suffix
        saved_file = cls(file_path=file_path, name=name,
                         project_id=project.id, extension=extension)
        db.session.add(saved_file)
        db.session.commit()
        sheet.yamlfiles.append(saved_file)
        project.modify()
        if not from_api_proj:
            saved_file.add_to_api_proj(sheet)
        return saved_file

    def add_to_api_proj(self, sheet):
        self.project.api_project.add_yaml_file(self.relative_path, sheet.data_file.relative_path, sheet.name, overwrite=True)
        self.project.api_project.save()
    


    

class WikifierFile(SavedFile):
    __tablename__ = 'wikifierfile'
    id = db.Column(db.Integer, db.ForeignKey(
        'saved_file.id'), primary_key=True)
    sub_folder = "wf"
    __mapper_args__ = {
        'polymorphic_identity': 'wikifierfile',
    }

    @classmethod
    def create_from_dataframe(cls, project, df):
        folder = cls.get_folder(project)
        filepath = str(folder / "wikify_region_output.csv")
        df.to_csv(filepath)
        wf = cls.create_from_filepath(project, filepath)
        return wf

    def add_to_api_proj(self):
        self.project.api_project.add_wikifier_file(self.relative_path, overwrite=True)
        self.project.api_project.save()

class PropertiesFile(SavedFile):
    __tablename__ = 'propertyfile'
    id = db.Column(db.Integer, db.ForeignKey(
        'saved_file.id'), primary_key=True)
    sub_folder = "pf"
    __mapper_args__ = {
        'polymorphic_identity': 'propertyfile',
    }

    @classmethod
    def create(cls, project, in_file):
        pf = super().create(project, in_file)
        return pf

    @classmethod
    def create_from_filepath(cls, project, in_file, from_api_proj=False):
        pf = super().create_from_filepath(project, in_file, from_api_proj)
        return pf
    
    def add_to_api_proj(self):
        self.project.api_project.add_wikidata_file(self.relative_path, overwrite=True)
        self.project.api_project.save()

    def create_from_dataframe(cls, project, df):
        folder = cls.get_folder(project)
        filepath = str(folder / "datamart_new_properties.tsv")
        df.to_csv(filepath, sep='\t', index=False)
        wf = cls.create_from_filepath(project, filepath)
        return wf

class ItemsFile(SavedFile):
    __tablename__ = 'itemfile'
    id = db.Column(db.Integer, db.ForeignKey(
        'saved_file.id'), primary_key=True)
    sub_folder = "if"
    __mapper_args__ = {
        'polymorphic_identity': 'itemfile',
    }

    @classmethod
    def create_from_dataframe(cls, project, df):
        folder = cls.get_folder(project)
        filepath = str(folder / "datamart_item_definitions.tsv")
        df.to_csv(filepath, sep='\t', index=False)
        wf = cls.create_from_filepath(project, filepath)
        return wf    
    
    def add_to_api_proj(self):
        self.project.api_project.add_wikidata_file(self.relative_path, overwrite=True)
        self.project.api_project.save()


class DataFile(SavedFile):
    __tablename__ = 'datafile'
    sub_folder = "df"
    id = db.Column(db.Integer, db.ForeignKey(
        'saved_file.id'), primary_key=True)
    current_sheet_id = db.Column(db.Integer())
    sheets = db.relationship("DataSheet", back_populates="data_file")
    wikifiles = db.relationship('WikifierFile',
                                secondary="datafile_wiki", lazy='subquery', backref=db.backref('datafiles', lazy=True))
    __mapper_args__ = {
        'polymorphic_identity': 'datafile',
    }

    @classmethod
    def create_from_filepath(cls, project, file_path, from_api_proj=False):
        df = super().create_from_filepath(project, file_path, from_api_proj)
        df.init_sheets()
        return df

    @classmethod
    def create(cls, project, in_file):
        df = super().create(project, in_file)
        df.init_sheets()
        return df

    def init_sheets(self):
        spreadsheet = SpreadsheetFile(self.file_path)
        for sheet_name in spreadsheet:
            ps = DataSheet(name=sheet_name, data_file_id=self.id)
            db.session.add(ps)
        db.session.commit()
        self.current_sheet_id = self.sheets[0].id
        db.session.commit()

    @property
    def current_sheet(self):
        return DataSheet.query.get(self.current_sheet_id)

    def change_sheet(self, sheet_name):
        newcurrsheet = DataSheet.query.filter_by(
            name=sheet_name, data_file_id=self.id).order_by(DataSheet.id.desc()).first()
        if newcurrsheet:
            self.current_sheet_id = newcurrsheet.id
            db.session.commit()
            return newcurrsheet
        else:
            raise ValueError("No such sheet")
    
    def add_to_api_proj(self):
        self.project.api_project.add_data_file(self.relative_path, overwrite=True)
        self.project.api_project.save()

class DataSheet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64))
    data_file_id = db.Column(db.Integer, db.ForeignKey('datafile.id'))
    data_file = db.relationship("DataFile", back_populates="sheets")
    yamlfiles = db.relationship('YamlFile',
                                secondary="yaml_sheet", lazy='subquery', backref=db.backref('sheets', lazy=True))

    @property
    def yaml_file(self):
        # a temporary function while we are still supporting single files only
        if len(self.yamlfiles):
            return self.yamlfiles[-1]
        return None


yaml_sheet = db.Table('yaml_sheet',
                      db.Column('sheet_id', db.Integer,
                                db.ForeignKey('data_sheet.id')),
                      db.Column('yaml_id', db.Integer,
                                db.ForeignKey('yamlfile.id'))
                      )

datafile_wiki = db.Table('datafile_wiki',
                         db.Column('wikifier_id', db.Integer,
                                   db.ForeignKey('wikifierfile.id')),
                         db.Column('data_file_id', db.Integer,
                                   db.ForeignKey('datafile.id'))
                         )
