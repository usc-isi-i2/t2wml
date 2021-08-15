import os
import pandas as pd
import numpy as np
import requests
from io import StringIO
##
import logging
import numpy as np
from functools import partial
import rltk.similarity as sim
from abc import ABC, abstractmethod
from t2wml.spreadsheets.conversions import to_excel
from t2wml.wikification.country_wikifier_cache import countries


def wikify_selection(calc_params, selection, url="https://dsbox02.isi.edu:8888/wikifier/wikify"):
    (col1, row1), (col2, row2) = selection
    sheet_name = calc_params.sheet.name
    data_file_name = calc_params.sheet.data_file_name
    sheet=calc_params.sheet

    values = list(set(sheet[row1:row2+1, col1:col2+1].to_numpy().flatten().tolist()))
    df = pd.DataFrame([])
    df['value'] = values
    
    csv_str = df.to_csv(index=None)
    binary = csv_str.encode()
    url += f'?k=1&columns={"value"}'

    files = {
        'file': (sheet.data_file_name, binary, 'application/octet-stream')
    }

    resp = requests.post(url, files=files)
    if resp.status_code >299 :
        raise ValueError("Failed to get response from wikifier service or service errored out")


    s = str(resp.content, 'utf-8')
    data = StringIO(s)

    try:
        df = pd.read_csv(data)
        df = df.replace(r'^\s*$', np.nan, regex=True)
        check_na = df['value_kg_id'].notna()
        missing_values = df[np.invert(check_na)]
        df = df[check_na] #trim anything that didn't wikify successfully
        df = df[df["value_score"] > 0.9] #trim anything whose score is too low
        ids=df.pop("value_kg_id")
        values=df["value"]
        labels= df.pop("value_kg_label")
        scores= df.pop("value_score")
        aliases=df.pop("value_kg_aliases")
        descriptions= df.pop("value_kg_descriptions")
        entities_dict={}
        lookup_dict={}
        for index, id in enumerate(ids):
            entities_dict[id]={"label": labels.iloc[index], "description": descriptions.iloc[index]}
            lookup_dict[values.iloc[index]]=id
        problem_cells=[]
        for index, line in missing_values.iterrows():
            problem_cells.append(to_excel(line.column, line.row))

        df_rows = []
        for col in range(col1, col2+1):
            for row in range(row1, row2+1):
                value=sheet[row, col]
                if value in lookup_dict:
                    df_rows.append([col, row, value, data_file_name, sheet_name, "", lookup_dict[value]])
        df = pd.DataFrame(df_rows, columns=[
                        "column", "row", "value", "file", "sheet", "context", "item"])

        return df, entities_dict, problem_cells
    except Exception as e:
        print(e)
        raise e


