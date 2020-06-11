import pandas as pd
import os
import csv

from collections import defaultdict

"""
How to use:
Step 1: load file
a. call "load_csvs" send with the 3 file's path
b. call "load_xlsx" send with one file path

Step 2: generate file
call "generate" after you loaded the file 

the output folder location and column name config (optional) if needed
if column name config not given or partial not given the system will use:

Example file:
https://docs.google.com/spreadsheets/d/1NuTmRIxpy460S4CRdP6XORKFILssOby_RxiFbONXwv0/edit#gid=756069733


column_name_config = {
    "attributes_file_node_column_name": "Property",
    "attributes_file_node_label_column_name": "Attribute",
    "unit_file_node_column_name": "Q-Node",
    "unit_file_node_label_column_name": "Unit"
}
# first method
dataset_file = "./Dataset.csv"
attributes_file = "./Attributes.csv"
units_file = "./Units.csv"
loaded_file = load_csvs(dataset_file, attributes_file, units_file)
generate(loaded_file , ".", column_name_config)

# second method:
# specify the sheet name if needed
sheet_name_config = {"dataset_file": "Dataset", "attributes_file": "Attributes", "units_file": "Units"}
all_file = "all.xlsx"
loaded_file = load_xlsx(all_file)
generate(loaded_file , ".", column_name_config)

For attribute file:
Assume "Property" column exist and it is the node column
Assume "Attribute" column exist and it is the label column

For unit file:
Assume "Unit" column exist and it is the node column
Assume "Q-Node" column exist and it is the label column
"""


def load_csvs(dataset_file: str, attributes_file: str, units_file: str):
    loaded_file = {}
    files = [dataset_file, attributes_file, units_file]
    file_type = ["dataset_file", "attributes_file", "units_file"]
    for each_file, each_file_type in zip(files, file_type):
        if each_file:
            if not os.path.exists(each_file):
                raise ValueError("{} {} not exist!".format(each_file_type, each_file))
            loaded_file[each_file_type] = pd.read_csv(each_file)
    return loaded_file


def load_xlsx(input_file: str, sheet_name_config: dict = None):
    loaded_file = {}
    if not sheet_name_config:
        sheet_name_config = {"dataset_file": "Dataset", "attributes_file": "Attributes", "units_file": "Units"}
    for k, v in sheet_name_config.items():
        loaded_file[k] = pd.read_excel(input_file, v)
    return loaded_file


def generate(loaded_file: dict, output_path: str = ".", column_name_config=None) -> None:
    if column_name_config is None:
        column_name_config = {}
    if "attributes_file_node_column_name" not in column_name_config:
        column_name_config["attributes_file_node_column_name"] = "Property"
    if "attributes_file_node_label_column_name" not in column_name_config:
        column_name_config["attributes_file_node_label_column_name"] = "Attribute"
    if "unit_file_node_column_name" not in column_name_config:
        column_name_config["unit_file_node_column_name"] = "Q-Node"
    if "unit_file_node_label_column_name" not in column_name_config:
        column_name_config["unit_file_node_label_column_name"] = "Unit"

    if len(loaded_file["dataset_file"]["node1"].unique()) > 1:
        raise ValueError("One dataset file should only contains 1 dataset ID in `node1` column.")

    dataset_id = loaded_file["dataset_file"]["node1"].iloc[0]
    # generate files
    memo = defaultdict(dict)
    kgtk_properties_df = generate_KGTK_properties_file(loaded_file["attributes_file"], dataset_id, memo,
                                                       column_name_config["attributes_file_node_column_name"],
                                                       column_name_config["attributes_file_node_label_column_name"])
    kgtk_variables_df = generate_KGTK_variables_file(loaded_file["attributes_file"], dataset_id, memo,
                                                     column_name_config["attributes_file_node_column_name"],
                                                     column_name_config["attributes_file_node_label_column_name"])
    kgtk_units_df = generate_KGTK_units_file(loaded_file["units_file"], dataset_id, memo,
                                             column_name_config["unit_file_node_column_name"],
                                             column_name_config["unit_file_node_label_column_name"])
    wikifier_df = generate_wikifier_file(memo)
    # save output
    output_files = [kgtk_properties_df, kgtk_variables_df, kgtk_units_df, wikifier_df]
    output_file_names = ["kgtk_properties.tsv", "kgtk_variables.tsv", "kgtk_units.tsv", "wikifier.csv"]
    if not os.path.exists(output_path):
        os.mkdir(output_path)
    for each_file, each_file_name in zip(output_files, output_file_names):
        output_file_path = os.path.join(output_path, each_file_name)
        if each_file_name.endswith(".csv"):
            each_file.to_csv(output_file_path, index=False)
        elif each_file_name.endswith(".tsv"):
            each_file.to_csv(output_file_path, sep='\t', index=False, quoting=csv.QUOTE_NONE)


def generate_KGTK_properties_file(input_df: pd.DataFrame, dataset_id: str, memo: dict, node_column_name="Property",
                                  node_label_column_name="Attribute"):
    node_number = 1
    count = 0
    output_df_dict = {}
    input_df = input_df.fillna("")
    for _, each_row in input_df.iterrows():
        node_number += 1
        if each_row[node_column_name] == "":
            node_id = "P{}-{:03}".format(dataset_id, node_number)
            memo["property"][node_id] = each_row[node_label_column_name]
            labels = ["data_type", "P31", "label"]
            node2s = ["Quantity", "Q18616576", to_kgtk_format_string(each_row[node_label_column_name])]
            for i in range(3):
                # if node2s[i].startswith("Q"):
                # id_ = "{}-{}-{}".format(node_id, labels[i], node2s[i])
                # else:
                id_ = "{}-{}".format(node_id, labels[i])
                output_df_dict[count] = {"id": id_, "node1": node_id, "label": labels[i], "node2": node2s[i]}
                count += 1
        else:
            memo["property"][each_row[node_column_name]] = each_row[node_label_column_name]
    # get output
    output_df = pd.DataFrame.from_dict(output_df_dict, orient="index")
    return output_df


def generate_KGTK_variables_file(input_df: pd.DataFrame, dataset_id: str, memo: dict, node_column_name="Property",
                                 node_label_column_name="Attribute"):
    node_number = 1
    count = 0
    output_df_dict = {}
    input_df = input_df.fillna("")
    for _, each_row in input_df.iterrows():
        node_number += 1
        if each_row[node_column_name] == "":
            p_node_id = "P{}-{:03}".format(dataset_id, node_number)
        else:
            p_node_id = each_row[node_column_name]
        q_node_id = "Q{}-{:03}".format(dataset_id, node_number)
        memo["variable"][q_node_id] = each_row[node_label_column_name]
        labels = ["label", "description", "P31", "P1687", "P2006020002", "P2006020002", "P361", "P2006020003"]
        node2s = [to_kgtk_format_string(each_row[node_label_column_name]),
                  to_kgtk_format_string("{} in {}".format(each_row[node_label_column_name], dataset_id)), "Q50701", p_node_id,
                  "P585", "P248", "Q" + dataset_id, q_node_id]
        node1s = [q_node_id] * 7 + ["Q" + dataset_id]
        for i in range(8):
            if i in {2, 3, 6}:
                id_ = "{}-{}-1".format(node1s[i], labels[i])
            elif i in {4, 5, 7}:
                id_ = "{}-{}-{}".format(node1s[i], labels[i], node2s[i])
            else:
                id_ = "{}-{}".format(node1s[i], labels[i])
            output_df_dict[count] = {"id": id_, "node1": node1s[i], "label": labels[i], "node2": node2s[i]}
            count += 1
    # get output
    output_df = pd.DataFrame.from_dict(output_df_dict, orient="index")
    return output_df


def generate_KGTK_units_file(input_df: pd.DataFrame, dataset_id: str, memo: dict, node_column_name="Q-Node",
                             node_label_column_name="Unit"):
    node_number = 1
    count = 0
    output_df_dict = {}
    input_df = input_df.fillna("")
    for _, each_row in input_df.iterrows():
        node_number += 1
        if each_row[node_column_name] == "":
            node_id = "Q{}-U{:03}".format(dataset_id, node_number)
            labels = ["label", "P31"]
            node2s = [to_kgtk_format_string(each_row[node_label_column_name]), "Q47574"]
            memo["unit"][node_id] = each_row[node_label_column_name]
            for i in range(2):
                id_ = "{}-{}".format(node_id, labels[i])
                output_df_dict[count] = {"id": id_, "node1": node_id, "label": labels[i], "node2": node2s[i]}
                count += 1
        else:
            memo["unit"][each_row[node_column_name]] = each_row[node_label_column_name]
    # get output
    output_df = pd.DataFrame.from_dict(output_df_dict, orient="index")
    return output_df


def generate_wikifier_file(memo):
    output_df_dict = {}
    count = 0
    for memo_type, each_memo in memo.items():
        for node, label in each_memo.items():
            output_df_dict[count] = {"column": "", "row": "", "value": label, "context": memo_type, "item": node}
            count += 1
    # get output
    output_df = pd.DataFrame.from_dict(output_df_dict, orient="index")
    return output_df


def to_kgtk_format_string(s):
    if '"' in s:
        return "'" + s + "'"
    else:
        return '"' + s + '"'
