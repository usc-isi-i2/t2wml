import csv
import tarfile
import tempfile
import pandas as pd
from requests import post
from app_config import DATAMART_API_ENDPOINT


class AnnotationIntegration(object):
    def __init__(self, w_requests, is_csv, sheet_name):
        self.w_requests = w_requests
        if not is_csv:
            df = pd.read_excel(w_requests.files['file'], dtype=object, header=None, sheet_name=sheet_name).fillna('')
        else:
            df = pd.read_csv(w_requests.files['file'], dtype=object, header=None).fillna('')
        self.df = df
        self.dataset = None

    def is_annotated_spreadsheet(self):
        # very basic check to see if the uploaded file looks like annotated file
        if self.df.iloc[0, 0].strip().lower() == 'dataset' \
                and self.df.iloc[1, 0].strip().lower() == 'role' \
                and self.df.iloc[2, 0].strip().lower() == 'type' \
                and self.df.iloc[3, 0].strip().lower() == 'description' \
                and self.df.iloc[4, 0].strip().lower() == 'name' \
                and self.df.iloc[5, 0].strip().lower() == 'unit':
            self.dataset = self.df.iloc[0, 1].strip()
            return True

        return False

    def get_files(self):
        temp_dir = tempfile.mkdtemp()
        t_file = f'{temp_dir}/input_file_dm_t2wml.csv'
        self.df.to_csv(t_file, index=False, header=None)

        files = {
            'file': (t_file.split('/')[-1], open(t_file, mode='rb'), 'application/octet-stream')
        }
        response = post(f'{DATAMART_API_ENDPOINT}/datasets/{self.dataset}/annotated?validate=False&files_only=true',
                        files=files)

        d = open('{}/t2wml_annotation_files.tar.gz'.format(temp_dir), 'wb')
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
        return t2wml_yaml, consolidated_wikifier_df, combined_item_df
