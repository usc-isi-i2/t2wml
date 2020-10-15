import re
import hashlib
import tarfile
import tempfile
import traceback
import pandas as pd
from glob import glob
from pathlib import Path
from requests import post, get
from app_config import DATAMART_API_ENDPOINT
from utils import save_yaml, save_dataframe
from t2wml.api import add_entities_from_file


class AnnotationIntegration(object):
    def __init__(self, is_csv, sheet_name, w_requests=None, df=None):
        if w_requests is None and df is None:
            raise
        if w_requests is not None:
            if not is_csv:
                df = pd.read_excel(w_requests.files['file'], dtype=object, header=None, sheet_name=sheet_name).fillna(
                    '')
            else:
                df = pd.read_csv(w_requests.files['file'], dtype=object, header=None).fillna('')
        self.df = df
        self.dataset = None
        self.annotation = None

    def is_annotated_spreadsheet(self, project_path):
        # very basic check to see if the uploaded file looks like annotated file
        if self.df.iloc[0, 0].strip().lower() == 'dataset' \
                and self.df.iloc[1, 0].strip().lower() == 'role' \
                and self.df.iloc[2, 0].strip().lower() == 'type' \
                and self.df.iloc[3, 0].strip().lower() == 'description' \
                and self.df.iloc[4, 0].strip().lower() == 'name' \
                and self.df.iloc[5, 0].strip().lower() == 'unit':
            self.dataset = self.df.iloc[0, 1].strip()

            header_row, data_row = self.find_data_start_row()
            annotation_rows = list(range(0, 6)) + [header_row]
            self.annotation = self.df.iloc[annotation_rows].fillna("")
            self.save_annotation_file(project_path)
            return True

        return False

    def save_annotation_file(self, project_path):
        header_row = self.annotation.iloc[6]
        header_str = '_'.join(header_row).lower().strip()

        # basic cleanup
        header_str = re.sub(r"\s+", '_', header_str)
        header_str = header_str.replace("'", "")
        header_str = header_str.replace("\"", "")
        header_str = header_str.replace(",", "")
        header_str = header_str.replace("/", "")
        header_str = header_str.replace("\\", "")
        header_str = header_str.replace("%", "")
        header_str = header_str.replace("$", "")
        header_str = header_str.replace("#", "")
        header_str = header_str.replace("&", "")

        header_path = hashlib.sha256(header_str.encode()).hexdigest()
        # create the annotations folder for this project if it does not exist
        Path(f'{project_path}/annotations').mkdir(parents=True, exist_ok=True)
        self.annotation.to_csv(f'{project_path}/annotations/{header_path}.tsv', index=False, header=None, sep='\t')

    def is_annotation_available(self, project_path):
        # treat the first row as header as we don't know any better
        input_file_columns = self.df.iloc[0]
        annotation_path = Path(f'{project_path}/annotations')
        annotation_found = True
        new_df = None
        if annotation_path.is_dir():  # annotations folder exists
            ann_files = glob(f'{annotation_path}/*tsv')
            for annotation_file in ann_files:
                annotation_df = pd.read_csv(annotation_file, header=None, sep='\t').fillna('')
                headers = list(annotation_df.iloc[6])

                for c in input_file_columns:
                    annotation_found = annotation_found and (c in headers)
                if annotation_found:
                    n_header = self.df.iloc[0]
                    self.df.columns = n_header
                    self.df = self.df.reindex(columns=headers).fillna('')
                    annotation_df.columns = headers
                    new_df = pd.concat([annotation_df.iloc[0:6], self.df])
                    new_df.columns = range(new_df.shape[1])
                    new_df.iloc[6, 0] = 'header'
                    new_df.iloc[7, 0] = 'data'
                    break
        return annotation_found, new_df

    def check_dataset_exists(self):
        # This function will check if the dataset exists or not.
        # In case the dataset does not exist, we have the ability to create it using the information in cells A1, B1, C1 and D1.
        # If the information is not present and the dataset does not exist, ring the alarm bells

        if self.df.iloc[0, 1].strip() != '' and \
                self.df.iloc[0, 2].strip() != '' and \
                self.df.iloc[0, 3].strip() != '' and \
                self.df.iloc[0, 4].strip() != '':
            # we have enough information to create dataset if it does not exist, all is well
            return True

        else:
            response = get(f'{DATAMART_API_ENDPOINT}/metadata/datasets/{self.dataset}')
            dataset_metadata = response.json()
            if isinstance(dataset_metadata, dict):
                if 'Error' in dataset_metadata:
                    # dataset does not exist and we do not have enough information to create it, report the error
                    return False
        return True

    def get_files(self, filename):
        temp_dir = tempfile.mkdtemp()
        t_file = f'{temp_dir}/{filename}'
        if filename.endswith(".csv"):
            self.df.to_csv(t_file, index=False, header=None)
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            self.df.to_excel(t_file, index=False, header=None)

        files = {
            'file': (t_file.split('/')[-1], open(t_file, mode='rb'), 'application/octet-stream')
        }
        response = post(
            f'{DATAMART_API_ENDPOINT}/datasets/{self.dataset}/annotated?validate=False&files_only=true&create_if_not_exist=true',
            files=files)

        if response.status_code != 200:
            if "Error" in response.json():
                raise ValueError(response.json()["Error"])
            else:
                print(response.text)
                raise ValueError("Some problem when communicating with datamart")

        with open('{}/t2wml_annotation_files.tar.gz'.format(temp_dir), 'wb') as d:
            d.write(response.content)

        t2wml_yaml = None
        combined_item_df = None
        consolidated_wikifier_df = None
        tar = tarfile.open(f'{temp_dir}/t2wml_annotation_files.tar.gz')
        for member in tar.getmembers():
            f = tar.extractfile(member)
            if f is not None:
                f_name = member.name
                if f_name == './t2wml.yaml':
                    t2wml_yaml = f.read().decode('utf-8')
                if f_name == './consolidated_wikifier.csv':
                    consolidated_wikifier_df = pd.read_csv(f, dtype=object)
                if f_name == './item_definitions_all.tsv':
                    combined_item_df = pd.read_csv(f, dtype=object, sep='\t')
        return t2wml_yaml, consolidated_wikifier_df, combined_item_df, self.annotation

    def find_data_start_row(self) -> (int, int):
        # finds and returns header and data row index
        header_row = 6
        data_row = 7
        df = self.df.set_index(0)

        if "header" in df.index:
            header_row = df.index.tolist().index("header")
            if "data" not in df.index:
                data_row = header_row + 1

        if "data" in df.index:
            data_row = df.index.tolist().index("data")
        df.reset_index(inplace=True)
        return header_row, data_row

    def automate_integration(self, project, response, sheet):
        try:
            filename = response['tableData']['filename']
            dataset_exists = self.check_dataset_exists()
            if not dataset_exists:
                return False
            t2wml_yaml, consolidated_wikifier_df, combined_item_df, annotation_df = self.get_files(
                filename)
            if_path = save_dataframe(project, combined_item_df, "datamart_item_definitions.tsv", kgtk=True)
            add_entities_from_file(if_path)
            project.add_entity_file(if_path, copy_from_elsewhere=True, overwrite=True)

            wf_path = save_dataframe(project, consolidated_wikifier_df, "annotation_wikify_region_output.csv")
            project.add_wikifier_file(wf_path)
            project.update_saved_state(current_wikifiers=[wf_path])

            save_yaml(project, t2wml_yaml)  # give it a better name eventually

            project.save()
            return True
        except Exception as e:
            traceback.print_exc()
            print(e)  # continue to normal spreadsheet handling
            return True


def create_datafile(project, df, file_name, sheet_name):
    folder = project.directory

    filepath = f'{folder}/{file_name}'
    if file_name.endswith('.csv'):
        df.to_csv(filepath, index=False, header=False)
    elif file_name.endswith('.xlsx') or file_name.endswith('.xls'):
        with pd.ExcelWriter(filepath, engine='openpyxl', mode='a') as writer:
            workBook = writer.book
            try:
                workBook.remove(workBook[sheet_name])
            except:
                print("Worksheet does not exist")
            finally:
                df.to_excel(writer, sheet_name=sheet_name, index=False, header=None)
                writer.save()
    return df
