def get_excel_column_index(column):
    index=0
    column=column.upper()
    column=column[::-1]
    for i in range(len(column)):
        index+=((ord(column[i])%65 + 1)*(26**i))
    return index-1

def get_excel_row_index(row):
    return int(row)-1