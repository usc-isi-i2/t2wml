# The T2WML API: A programmatic way of using T2WML

example code:

```
# a script that iterates over a directory of csvs that can all be parsed using the same yaml file
import os
from t2wml.api import save_file, add_properties

properties_file= "custom_properties.json"
add_properties(properties_file)

data_folder="my_drive\my_data"
wikifier_filepath="my_drive\wikiers\wiki.csv"
yaml_filepath="my_drive\yaml1.yaml"
output_folder="my_drive\out"
for file_name in os.listdir(data_folder):
    data_filepath=os.path.join(data_folder, file_name)
    csv_sheet=file_name
    output_filename=os.path.join(output_folder, file_name)
    save_file(data_filepath, csv_sheet, yaml_filepath, wikifier_filepath,
                        output_filename, "tsv", project_name="Example Script")

```