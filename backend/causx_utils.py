import pandas as pd
from t2wml.input_processing.annotation_parsing import Annotation, create_nodes
from wikification import DatamartCountryWikifier

class AnnotationNodeGenerator:
    def __init__(self, annotation_nodes_array, project):
        self.annotation=Annotation(annotation_nodes_array)
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
