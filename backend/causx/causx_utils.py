import csv
import json
from io import StringIO
import pandas as pd
from t2wml.input_processing.annotation_parsing import Annotation, create_nodes
from t2wml.mapping.datamart_edges import clean_id
from t2wml.mapping.statement_mapper import PartialAnnotationMapper
from t2wml.api import kgtk_to_dict, t2wml_settings, KnowledgeGraph
from causx.wikification import DatamartCountryWikifier
from causx.cameos import cameos
from causx.coords import coords



class AnnotationNodeGenerator:
    def __init__(self, annotation, project):
        self.annotation=annotation
        self.project=project

    def _get_units(self, region):
        unit=region.matches.get("unit")
        if unit:
            units=set()
            for row in range(unit.row_args[0], unit.row_args[1]+1):
                    for col in range(unit.col_args[0], unit.col_args[1]+1):
                        units.add((row, col))
            return list(units)
        return []

    def _get_properties(self, region):
        range_property = region.matches.get("property")
        if range_property:
            range_properties=set()
            for row in range(range_property.row_args[0], range_property.row_args[1]+1):
                for col in range(range_property.col_args[0], range_property.col_args[1]+1):
                    range_properties.add((row, col))
            return list(range_properties), region.type
        return [], None

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

    def wikify_countries(self, sheet, wikifier):
        subject_region=self.annotation.subject_annotations
        #check all main subject
        dcw=DatamartCountryWikifier()
        df, problem_cells = dcw.wikify_region(subject_region.selection, sheet)

        #check anything whose type is wikibaseitem
        for block in self.annotation.annotations_array:
            type=block.type
            if type in ["wikibaseitem", "WikibaseItem", "country", "Country"]:
                df2, problem_cells2 = dcw.wikify_region(block.selection, sheet)
                df = pd.concat([df, df2], ignore_index=True)
                problem_cells += problem_cells2
        self.project.add_df_to_wikifier_file(sheet.data_file_path, df, True)
        wikifier.add_dataframe(df)


    def preload(self, sheet, wikifier):
        self.annotation.initialize()
        self.wikify_countries(sheet, wikifier)
        properties, items = self.get_custom_properties_and_qnodes()
        create_nodes(items, self.project, sheet, wikifier)
        for property_indices, data_type in properties:
            if property_indices:
                create_nodes(property_indices, self.project, sheet, wikifier, True, data_type)

    @classmethod
    def load_from_path(cls, annotation_path, project):
        an=Annotation.load(project.get_full_path(annotation_path))
        return cls(an, project)

    @classmethod
    def load_from_array(cls, annotation_nodes_array, project):
        an = Annotation(annotation_nodes_array)
        return cls(an, project)


def get_entities(project):
    entity_dict={}
    for file in project.entity_files:
        full_path=project.get_full_path(file)
        entity_dict.update(kgtk_to_dict(full_path))
    return entity_dict

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
        variable_entry=entities[statement["property"]]
        tags=variable_entry.get("tags", [])
        for tag in tags:
            label, value = tag.split(":", 1)
            statement_dict[label]=value
            if label not in ["FactorClass","Relevance","Normalizer","Units","DocID"]:
                new_columns.add(label)

        new_columns=list(new_columns)
        column_titles+=new_columns

        dict_values.append(statement_dict)
    return column_titles, dict_values


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



def get_causx_partial_csv(calc_params, start=0, end=150):
    cell_mapper = PartialAnnotationMapper(calc_params.annotation_path)
    kg = KnowledgeGraph.generate(cell_mapper, calc_params.sheet, calc_params.wikifier, start, end)
    columns=["dataset_id", "variable_id", "variable", "main_subject", "main_subject_id", "value",
                    "time","time_precision", "country","country_id","country_cameo",
                    "admin1","admin2","admin3",
                    "region_coordinate","stated_in","stated_in_id","stated in",
                    "FactorClass","Relevance","Normalizer","Units","DocID"]

    if not kg.statements:
        df=pd.DataFrame([], columns=columns)
        if cell_mapper.annotation.subject_annotations:
            subject_cells=[]
            (x1, y1),(x2, y2)=subject_block_cells=cell_mapper.annotation.subject_annotations[0].cell_args
            for row in range(y1, y2+1):
                for col in range(x1, x2+1):
                    subject_cells.append(calc_params.sheet[row, col])
            df.main_subject=subject_cells
        df.dataset_id=calc_params.project.dataset_id
    else:
        columns, dict_values=get_cells_and_columns(kg.statements, calc_params.project)
        df = pd.DataFrame.from_dict(dict_values)
        #df.replace(to_replace=[None], value="", inplace=True)
        #df = df[columns] # sort the columns
    dims = list(df.shape)
    cells = json.loads(df.to_json(orient="values"))
    cells.insert(0, list(df.columns))
    return dict(dims=dims, firstRowIndex=0, cells=cells)
