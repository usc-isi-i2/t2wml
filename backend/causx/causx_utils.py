import csv
import json
from io import StringIO
import pandas as pd
from t2wml.input_processing.annotation_parsing import Annotation, create_nodes
from t2wml.mapping.datamart_edges import clean_id as _clean_id
from t2wml.mapping.statement_mapper import PartialAnnotationMapper
from t2wml.api import kgtk_to_dict, t2wml_settings, KnowledgeGraph
from causx.wikification import DatamartCountryWikifier
from causx.cameos import cameos
from causx.coords import coords

def clean_id(input):
    if input is None:
        return ""
    return _clean_id(input)

def error_with_func(func=None):
    def wrapper(*args, **kwargs):
        try:
            function_name = func.__func__.__qualname__
        except:
            function_name = func.__qualname__
        try:
            result= func(*args, **kwargs)
            return result
        except Exception as e:
            raise ValueError(f"Error returned from {function_name}: {str(e)}")
    return wrapper



class AnnotationNodeGenerator:
    def __init__(self, annotation, project):
        self.annotation=annotation
        self.project=project

    @error_with_func
    def _get_units(self, region):
        unit=region.matches.get("unit")
        if unit:
            units=set()
            for row in range(unit.row_args[0], unit.row_args[1]+1):
                    for col in range(unit.col_args[0], unit.col_args[1]+1):
                        units.add((row, col))
            return list(units)
        return []

    @error_with_func
    def _get_properties(self, region):
        range_property = region.matches.get("property")
        if range_property:
            range_properties=set()
            for row in range(range_property.row_args[0], range_property.row_args[1]+1):
                for col in range(range_property.col_args[0], range_property.col_args[1]+1):
                    range_properties.add((row, col))
            return list(range_properties), region.type
        return [], None

    @error_with_func
    def get_custom_properties_and_qnodes(self):
        custom_properties=list()
        custom_items=set()

        data_region=self.annotation.data_annotations
        qualifier_regions=self.annotation.qualifier_annotations

        #check all properties
        custom_properties.append(self._get_properties(data_region))
        for qualifier_region in qualifier_regions:
            custom_properties.append(self._get_properties(qualifier_region))

        #check all units
        custom_items.update(self._get_units(data_region))
        for qualifier_region in qualifier_regions:
            custom_items.update(self._get_units(qualifier_region))

        return custom_properties, list(custom_items)

    @error_with_func
    def wikify_countries(self, sheet, wikifier):
        try:
            df = pd.DataFrame([])
        except:
            raise ValueError("83")
        try:
            subject_region=self.annotation.subject_annotations
        except:
            raise ValueError("89")

        if subject_region:
            if isinstance(subject_region, list):
                subject_region=subject_region[0]
            #check all main subject
            try:
                dcw=DatamartCountryWikifier()
            except:
                raise ValueError("96")
            try:
                df, problem_cells = dcw.wikify_region(subject_region.selection, sheet)
            except:
                raise ValueError("100")

        #check anything whose type is wikibaseitem
        for block in self.annotation.annotations_array:
            type=block.type
            if type in ["wikibaseitem", "WikibaseItem", "country", "Country"]:
                try:
                    df2, problem_cells2 = dcw.wikify_region(block.selection, sheet)
                except:
                    raise ValueError("109")
                try:
                    df = pd.concat([df, df2], ignore_index=True)
                except:
                    raise ValueError("113")
                problem_cells += problem_cells2
        if not df.empty:
            try:
               self.project.add_df_to_wikifier_file(sheet.data_file_path, df, True)
            except:
                raise ValueError("119")

            try:
                wikifier.add_dataframe(df)
            except:
                raise ValueError("124")

    @error_with_func
    def preload(self, sheet, wikifier):
        if self.annotation.data_annotations:
            self.annotation.initialize()
            self.wikify_countries(sheet, wikifier)
            properties, items = self.get_custom_properties_and_qnodes()
            create_nodes(items, self.project, sheet, wikifier)
            for property_indices, data_type in properties:
                if property_indices:
                    create_nodes(property_indices, self.project, sheet, wikifier, True, data_type)
            self.project.save()

    @classmethod
    @error_with_func
    def load_from_path(cls, annotation_path, project):
        an=Annotation.load(project.get_full_path(annotation_path))
        return cls(an, project)

    @classmethod
    @error_with_func
    def load_from_array(cls, annotation_nodes_array, project):
        an = Annotation(annotation_nodes_array)
        return cls(an, project)

@error_with_func
def get_entities(project):
    entity_dict={}
    for file in project.entity_files:
        full_path=project.get_full_path(file)
        entity_dict.update(kgtk_to_dict(full_path))
    return entity_dict

@error_with_func
def try_get_label(input):
    provider = t2wml_settings.wikidata_provider
    if not input:
        return input
    if input[0] in ["P", "Q"]:
        try:
            entry = provider.get_entity(input)
            if entry and 'label' in entry:
                return entry['label']
        except Exception as e:
            pass
    return input

@error_with_func
def get_cells_and_columns(statements, project):
    column_titles=["dataset_id", "variable_id", "variable", "main_subject", "main_subject_id", "value",
                    "time","time_precision", "country","country_id","country_cameo",
                    "admin1","admin2","admin3",
                    "region_coordinate","stated_in","stated_in_id","stated in",
                    "FactorClass","Relevance","Normalizer","Units","DocID"]
    dict_values=[]
    new_columns=set()
    for cell, statement in statements.items():
        variable=try_get_label(statement["property"])
        main_subject_id=statement["subject"]

        statement_dict=dict(dataset_id=project.dataset_id,
        admin1="", admin2="", admin3="",
        stated_in="", stated_in_id="",
        variable=variable,
        variable_id=clean_id(variable),
        value=statement["value"],
        main_subject_id=statement["subject"],
        main_subject=try_get_label(main_subject_id),
        country_id=main_subject_id,
        country_cameo=cameos.get(main_subject_id, ""),
        region_coordinate=coords.get(main_subject_id, ""),
        FactorClass="", Relevance="", Normalizer="", Units="", DocID="", time="", time_precision="")

        statement_dict["stated in"]=""

        for qualifier in statement["qualifier"]:
            if qualifier["property"]=="P585": #time, time_precision
                statement_dict["time"]=qualifier["value"]
                statement_dict["time_precision"]=qualifier.get("precision", "")
            elif qualifier["property"]=="P248": #stated_in, stated_in_id, stated in
                statement_dict["stated in"]=try_get_label(qualifier["value"])

            else:
                q_label=try_get_label(qualifier["property"])
                if q_label not in new_columns:
                    new_columns.add(q_label)
                statement_dict[q_label]=qualifier["value"]


        entities=get_entities(project)
        if statement.get("property"):
            variable_entry=entities[statement["property"]]
            tags=variable_entry.get("tags", [])
            for tag in tags:
                label, value = tag.split(":", 1)
                statement_dict[label]=value
                if label not in ["FactorClass","Relevance","Normalizer","Units","DocID"]:
                    new_columns.add(label)
        dict_values.append(statement_dict)

    new_columns=list(new_columns)
    column_titles+=new_columns
    return column_titles, dict_values

@error_with_func
def causx_create_canonical_spreadsheet(statements, project):
    column_titles, dict_values = get_cells_and_columns(statements, project)

    string_stream = StringIO("", newline="")
    writer = csv.DictWriter(string_stream, column_titles,
                             restval="",
                             lineterminator="\n",
                             escapechar="",
                             #quotechar='',
                             dialect=csv.unix_dialect,
                             #quoting=csv.QUOTE_NONE
                             )
    writer.writeheader()
    for entry in dict_values:
        dict_columns=set(entry.keys())
        extra_columns=dict_columns-set(column_titles)

        writer.writerow(entry)

    output = string_stream.getvalue()
    string_stream.close()
    return output


@error_with_func
def get_causx_partial_csv(calc_params, start=0, end=150):
    cell_mapper = PartialAnnotationMapper(calc_params.annotation_path)
    kg = KnowledgeGraph.generate(cell_mapper, calc_params.sheet, calc_params.wikifier, start, end)
    columns=["dataset_id", "variable_id", "variable", "main_subject", "main_subject_id", "value",
                    "time","time_precision", "country","country_id","country_cameo",
                    "admin1","admin2","admin3",
                    "region_coordinate","stated_in","stated_in_id","stated in",
                    "FactorClass","Relevance","Normalizer","Units","DocID"]

    if not kg.statements: #nonetheless add at least some of the annotation
        df=pd.DataFrame([], columns=columns)
        role_map={"mainSubject":"main_subject", "dependentVar": "value", "property":"variable"}
        for block in cell_mapper.annotation.annotations_array:
            if isinstance(block, list):
                block=block[0]
            if block.role in role_map:
                cells=[]
                (x1, y1),(x2, y2)=block.cell_args
                for row in range(y1, y2+1):
                    for col in range(x1, x2+1):
                        cells.append(calc_params.sheet[row, col])
            df[role_map[block.role]]=cells
        df.dataset_id=calc_params.project.dataset_id
    else:
        columns, dict_values=get_cells_and_columns(kg.statements, calc_params.project)
        df = pd.DataFrame.from_dict(dict_values)
        #df.replace(to_replace=[None], value="", inplace=True)
        #df = df[columns] # sort the columns
    df = df.filter(columns)
    dims = list(df.shape)
    cells = json.loads(df.to_json(orient="values"))
    cells.insert(0, list(df.columns))
    return dict(dims=dims, firstRowIndex=0, cells=cells)
