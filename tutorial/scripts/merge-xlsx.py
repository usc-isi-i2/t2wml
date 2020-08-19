import sys
import os

import pandas as pd

xlsx_files = sys.argv[1:]
result = 'combined.xlsx'
if result in xlsx_files:
    xslx_files.remove('combined.xlsx')
xlsx_files.sort()

with pd.ExcelWriter(result) as writer:
    for filename in xlsx_files:
        print(filename)
        df = pd.read_excel(filename, header=None)
        sheet_name = filename.split('.')[0]
        df.to_excel(writer, sheet_name=sheet_name)
