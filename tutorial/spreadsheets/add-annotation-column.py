import sys
import os

import pandas as pd

xlsx_files = sys.argv[1:]
result = 'combined.xlsx'
if result in xlsx_files:
    xslx_files.remove('combined.xlsx')
xlsx_files.sort()

for filename in xlsx_files:
    new_filename = filename.split('.')[0] + '_annotated.xlsx'
    print(filename)
    df = pd.read_excel(filename, header=None)
    df.index = df.index+6
    df.columns = df.columns + 1
    for row,value in zip(range(8), ['dataset', 'role', 'type', 'description', 'name', 'unit', 'header', 'data']):
        df.loc[row, 0] = value
    df.loc[0,1] = 'tutorial_dataset'
    df = df.sort_index()
    df = df[range(df.shape[1])]
    df.to_excel(new_filename, header=False, index=False)
