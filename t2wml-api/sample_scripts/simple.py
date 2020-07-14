from t2wml.api import add_properties_from_file, KnowledgeGraph
def main(property_file, data_filepath, sheet_name, yaml_filepath, wikifier_filepath, output_filepath):
    add_properties_from_file(property_file)
    kg=KnowledgeGraph.generate_from_files(data_filepath, sheet_name, yaml_filepath, wikifier_filepath)
    kg.save_kgtk(output_filepath)
