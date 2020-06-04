import string
import pandas as pd

file = "homicide_report_total_and_sex.xlsx"

xlsx = pd.ExcelFile(file)
for sheet_name in xlsx.sheet_names:
    if sheet_name.startswith('table'):
        sheet = xlsx.parse(sheet_name, header=None)
        sheet.columns = list(string.ascii_uppercase[:len(sheet.columns)])
        sheet.to_csv(sheet_name + '.csv', header=True, index=True)

