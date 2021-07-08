import csv
import json
import os
from io import StringIO
import pandas as pd
from t2wml.input_processing.annotation_parsing import Annotation, create_nodes, create_nodes_from_selection
from t2wml.mapping.datamart_edges import clean_id as _clean_id
from t2wml.mapping.statement_mapper import PartialAnnotationMapper
from t2wml.api import kgtk_to_dict, t2wml_settings, KnowledgeGraph
from t2wml.wikification.utility_functions import dict_to_kgtk
from causx.wikification import DatamartCountryWikifier
from causx.cameos import cameos
from causx.coords import coords


def clean_id(input):
    if not input:
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

        country_selections=[]

        if subject_region:
            if isinstance(subject_region, list):
                subject_region=subject_region[0]
            #check all main subject
            country_selections.append(subject_region.selection)
            dcw=DatamartCountryWikifier()
            df, problem_cells = dcw.wikify_region(subject_region.selection, sheet, wikifier)


        #check anything whose type is wikibaseitem
        for block in self.annotation.annotations_array:
            type=block.type
            if type in ["wikibaseitem", "WikibaseItem", "country", "Country"]:
                country_selections.append(subject_region.selection)
                df2, problem_cells2 = dcw.wikify_region(block.selection, sheet, wikifier)
                df = pd.concat([df, df2], ignore_index=True)
                problem_cells += problem_cells2

        #anything that didn't successfully get country-wikified, auto-generate nodes for:
        for selection in country_selections:
            tuple_selection = ((selection["x1"]-1, selection["y1"]-1), (selection["x2"]-1, selection["y2"]-1))
            create_nodes_from_selection(tuple_selection, self.project, sheet, wikifier)

        if not df.empty:
                self.project.add_df_to_wikifier_file(sheet.data_file_path, df, True)
                wikifier.add_dataframe(df)

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
def preload(calc_params):
    ang=AnnotationNodeGenerator.load_from_path(calc_params.annotation_path, calc_params.project)
    ang.preload(calc_params.sheet, calc_params.wikifier)
    calc_params.project.save()


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
                    "time","time_precision",
                    "country","country_id","country_cameo", "region_coordinate",
                    "FactorClass","Relevance","Normalizer","Units","DocID",
                    "admin1","admin2","admin3","stated_in","stated_in_id"]
    dict_values=[]
    new_columns=set()
    for cell, statement in statements.items():
        variable=try_get_label(statement.get("property", ""))
        main_subject_id=statement.get("subject", "")
        statement_dict={}
        try:
            statement_dict=dict(dataset_id=project.dataset_id,
            admin1="", admin2="", admin3="",
            stated_in="", stated_in_id="")
        except Exception as e:
            raise ValueError(str(e)+"188")

        try:
            statement_dict.update(dict(
            variable=variable,
            variable_id=clean_id(variable),
            value=statement.get("value", "")))
        except Exception as e:
            raise ValueError(str(e)+"195")

        try:
            statement_dict.update(dict(
            main_subject_id=main_subject_id,
            main_subject=try_get_label(main_subject_id),
            country_id=main_subject_id))
        except Exception as e:
            raise ValueError(str(e)+"203")

        try:
            statement_dict.update(dict(
            country_cameo=cameos.get(main_subject_id, ""),
            region_coordinate=coords.get(main_subject_id, ""),
            FactorClass="", Relevance="", Normalizer="", Units="", DocID="", time="", time_precision=""))
        except Exception as e:
            raise ValueError(str(e)+"211")


        for qualifier in statement.get("qualifier", []):
            if not qualifier.get("property"):
                continue
            if qualifier["property"]=="P585": #time, time_precision
                statement_dict["time"]=qualifier["value"]
                statement_dict["time_precision"]=qualifier.get("precision", "")
            elif qualifier["property"]=="P248": #stated_in, stated_in_id
                stated_in_val=try_get_label(qualifier["value"])
                statement_dict["stated_in"]=stated_in_val
                if stated_in_val!=qualifier["value"]:
                    statement_dict["stated_in_id"]=qualifier["value"]

            else:
                q_label=try_get_label(qualifier["property"])
                if q_label not in new_columns:
                    new_columns.add(q_label)
                statement_dict[q_label]=qualifier["value"]

        entities=causx_get_variable_dict(project)
        if statement.get("property"):
            variable_entry=entities.get(statement["property"], None)
            if variable_entry:
                tags=variable_entry.get("tags", {})
                for label, value in tags.items():
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
def df_to_table(df, columns):
    #df.replace(to_replace=[None], value="", inplace=True)
    #df = df[columns] # sort the columns
    df = df.filter(columns)
    df.drop(['variable_id', 'main_subject_id', 'stated_in', 'stated_in_id', 'admin1', 'admin2', 'admin3'], axis=1, errors='ignore')
    nan_value = float("NaN")
    df.replace("", nan_value, inplace=True)
    df.dropna(how='all', axis=1, inplace=True)
    dims = list(df.shape)
    cells = json.loads(df.to_json(orient="values"))
    cells.insert(0, list(df.columns))
    return dict(dims=dims, firstRowIndex=0, cells=cells)


@error_with_func
def get_causx_partial_csv(calc_params, start=0, end=150):
    columns = ["dataset_id", "variable", "main_subject", "value",
                    "time","time_precision",
                    "country","country_id","country_cameo","region_coordinate",
                    "FactorClass","Relevance","Normalizer","Units","DocID"]

    try:
        cell_mapper = PartialAnnotationMapper(calc_params.annotation_path)
    except FileNotFoundError as e:
        df=pd.DataFrame({"dataset_id":[calc_params.project.dataset_id]}, columns=columns)
        return df_to_table(df, columns)


    try:
        kg = KnowledgeGraph.generate(cell_mapper, calc_params.sheet, calc_params.wikifier, start, end)
    except Exception as e:
        raise ValueError(str(e)+"300")

    if not kg.statements: #nonetheless add at least some of the annotation
        df=pd.DataFrame([], columns=columns)
        role_map={"mainSubject":"main_subject", "dependentVar": "value", "property":"variable"}
        for block in cell_mapper.annotation.annotations_array:
            if isinstance(block, list):
                block=block[0]
            if block.role in role_map:
                try:
                    cells=[]
                    (x1, y1),(x2, y2)=block.cell_args
                    for row in range(y1, y2+1):
                        for col in range(x1, x2+1):
                            cells.append(calc_params.sheet[row, col])
                    df[role_map[block.role]]=cells
                except Exception as e:
                    raise ValueError(str(e)+"320"+block.role)
        df.dataset_id=calc_params.project.dataset_id
    else:
        try:
            columns, dict_values=get_cells_and_columns(kg.statements, calc_params.project)
            df = pd.DataFrame.from_dict(dict_values)
        except Exception as e:
            raise ValueError(str(e)+"341")
    return df_to_table(df, columns)



def causx_get_variable_dict(project):
    entity_dict={}
    for entity_file in project.entity_files:
        entity_dict.update(kgtk_to_dict(project.get_full_path(entity_file)))
    return entity_dict


def get_causx_tags(old_tags=None, new_tags=None):
    tags_dict={"FactorClass":"","Relevance":"","Normalizer":"","Units":"","DocID":""}
    if old_tags:
        tags_dict.update(old_tags)
    if new_tags:
        tags_dict.update(new_tags)
    return tags_dict


def causx_set_variable(project, id, updated_fields):
    variable_dict=causx_get_variable_dict(project)
    variable=variable_dict.get(id, None)

    if variable:
        old_tags = variable.get("tags")
        new_tags = updated_fields.get("tags", {})
        tags = get_causx_tags(old_tags, new_tags)
        filepath=variable_dict['filepath']['value']
        variable.update(updated_fields)
        variable["tags"]=tags
        full_contents = kgtk_to_dict(filepath)
        full_contents[id]=variable
        dict_to_kgtk(full_contents, filepath)
    else:
        raise ValueError("variable not found")
        filename="custom_user_variables.tsv"
        filepath=project.get_full_path(filename)
        if not os.path.exists(filepath):
            full_contents={}
        else:
            full_contents = kgtk_to_dict(filepath)
        full_contents[id]=variable
        dict_to_kgtk(full_contents, filepath)
        project.add_entity_file(filepath)
        project.save()
    return variable



def causx_get_variable_metadata(calc_params, statements):
    properties=set()
    for statement in statements.values():
        property = statement.get("property", None)
        if property:
            properties.add(property)

    variables=causx_get_variable_dict(calc_params.project)
    var_arr=[]
    for property in properties:
        variable = variables.get(property, None)
        if variable:
            var_dict=dict(
               name=variable["label"],
               variable_id=clean_id(variable["label"]),
               description=variable.get("description", ""),
               corresponds_to_property=property,
               tag=variable.get("tags", [])
            )
            var_arr.append(var_dict)
    return var_arr

