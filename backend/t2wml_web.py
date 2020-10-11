from collections import defaultdict
from t2wml.utils.t2wml_exceptions import T2WMLException, TemplateDidNotApplyToInput
from t2wml.api import Sheet, WikifierService, t2wml_settings
from t2wml.spreadsheets.conversions import column_index_to_letter, to_excel, column_letter_to_index
from app_config import db, UPLOAD_FOLDER, CACHE_FOLDER
from wikidata_models import DatabaseProvider, get_labels_and_descriptions


def wikify(calc_params, region, context):
    ws = WikifierService()
    df, problem_cells = ws.wikify_region(region, calc_params.sheet, context)
    return df, problem_cells


def update_t2wml_settings(project):
    t2wml_settings.sparql_endpoint = project.sparql_endpoint
    t2wml_settings.wikidata_provider = DatabaseProvider(project)
    t2wml_settings.warn_for_empty_cells = project.warn_for_empty_cells
    t2wml_settings.cache_data_files = True
    t2wml_settings.cache_data_files_folder = CACHE_FOLDER


def get_kg(calc_params):
    kg = calc_params.get_kg()
    db.session.commit()  # save any queried properties
    return kg


def download(calc_params, filetype):
    cache_holder = calc_params.cache

    response = dict()
    kg = cache_holder.result_cacher.get_kg()
    if not kg:
        kg = get_kg(calc_params)

    response["data"] = kg.get_output(filetype)
    response["error"] = None
    response["internalErrors"] = kg.errors if kg.errors else None
    return response


def highlight_region(calc_params):
    cache_holder = calc_params.cache
    highlight_data, statement_data, errors = cache_holder.result_cacher.get_highlight_region()
    if highlight_data:
        highlight_data['error'] = errors if errors else None
        highlight_data['cellStatements'] = statement_data
        return highlight_data

    highlight_data = {
        "dataRegion": {"color": "hsl(150, 50%, 90%)", "list": set()},
        "item": {"color": "hsl(200, 50%, 90%)", "list": set()},
        "qualifierRegion": {"color": "hsl(250, 50%, 90%)", "list": set()},
        'referenceRegion': {"color": "yellow", "list": set()},
        'error': dict()}
    kg = get_kg(calc_params)
    statement_data = kg.statements
    errors = kg.errors
    for cell in statement_data:
        highlight_data["dataRegion"]["list"].add(cell)
        statement = statement_data[cell]
        item_cell = statement.get("cell", None)
        if item_cell:
            highlight_data["item"]["list"].add(item_cell)
        qualifiers = statement.get("qualifier", None)
        if qualifiers:
            for qualifier in qualifiers:
                qual_cell = qualifier.get("cell", None)
                if qual_cell:
                    highlight_data["qualifierRegion"]["list"].add(qual_cell)

        references = statement.get("reference", None)
        if references:
            for ref in references:
                ref_cell = ref.get("cell", None)
                if ref_cell:
                    highlight_data["referenceRegion"]["list"].add(ref_cell)

    highlight_data['dataRegion']['list'] = list(
        highlight_data['dataRegion']['list'])
    highlight_data['item']['list'] = list(highlight_data['item']['list'])
    highlight_data['qualifierRegion']['list'] = list(
        highlight_data['qualifierRegion']['list'])
    highlight_data['referenceRegion']['list'] = list(
        highlight_data['referenceRegion']['list'])

    # handle error colors:
    orange = '#FF8000'
    red = '#FF3333'

    highlight_data['error'] = errors if errors else None
    highlight_data['dangerCells'] = {'color': orange, 'list': []}
    highlight_data['errorCells'] = {'color': red, 'list': []}

    for cell in errors:
        if len(set(["property", "value", "item"]).intersection(errors[cell].keys())):
            highlight_data['errorCells']['list'].append(cell)
        else:
            highlight_data['dangerCells']['list'].append(cell)

    cache_holder.result_cacher.save(highlight_data, statement_data, errors, kg.metadata)

    highlight_data['cellStatements'] = statement_data
    return highlight_data


def get_cell(calc_params, col, row):
    wikifier = calc_params.wikifier
    cache_holder = calc_params.cache
    sheet = calc_params.sheet
    try:
        # get cell statement
        row = int(row)
        col = column_letter_to_index(col) + 1
        statement, errors = cache_holder.cell_mapper.get_cell_statement(
            sheet, wikifier, col, row)
        data = {'statement': statement,
                'internalErrors': errors if errors else None, "error": None}

        # get cell qnodes
        qnodes = {}
        for outer_key, outer_value in statement.items():
            if outer_key == "qualifier":
                for qual_dict in outer_value:
                    for inner_key, inner_value in qual_dict.items():
                        if str(inner_value).upper()[0] in ["P", "Q"]:
                            qnodes[str(inner_value)] = None
            else:
                if str(outer_value).upper()[0] in ["P", "Q"]:
                    qnodes[str(outer_value)] = None

        labels = get_labels_and_descriptions(qnodes, calc_params.project.sparql_endpoint)
        qnodes.update(labels)

        data["qnodesLabels"] = qnodes

    except TemplateDidNotApplyToInput as e:
        data = dict(error=e.errors)
    except T2WMLException as e:
        data = dict(error=e.error_dict)
    return data


def handle_yaml(calc_params):
    if calc_params.yaml_path:
        yaml_path = calc_params.yaml_path
        response = dict()
        with open(yaml_path, "r", encoding="utf-8") as f:
            response["yamlFileContent"] = f.read()
        try:
            response['yamlRegions'] = highlight_region(calc_params)
        except Exception as e:  # this is something of a stopgap measure for now. need to do it properly later.
            orange = '#FF8000'
            red = '#FF3333'
            response['yamlRegions'] = {
                "dataRegion": {"color": "hsl(150, 50%, 90%)", "list": []},
                "item": {"color": "hsl(200, 50%, 90%)", "list": []},
                "qualifierRegion": {"color": "hsl(250, 50%, 90%)", "list": []},
                'referenceRegion': {"color": "yellow", "list": []},
                'dangerCells': {'color': orange, 'list': []},
                'errorCells': {'color': red, 'list': []},
                'error': dict()}
            # response['error']="Invalid YAML" #for now the UI is not good for this. once we separate the calls...
        return response
    return None


def serialize_item_table(calc_params):
    sheet = calc_params.sheet
    wikifier = calc_params.wikifier
    item_table = wikifier.item_table
    qnodes = defaultdict(defaultdict)
    rowData = list()
    items_to_get = set()

    for col in range(sheet.col_len):
        for row in range(sheet.row_len):
            item, context, value = item_table.get_cell_info(col, row, sheet)
            if item:
                items_to_get.add(item)
                # rowData:
                row_data = {
                    'context': context,
                    'col': column_index_to_letter(int(col)),
                    'row': str(int(row) + 1),
                    'value': value,
                    'item': item
                }
                rowData.append(row_data)
                # qnodes:
                cell = to_excel(col, row)
                qnodes[cell][context] = {"item": item}

    labels_and_descriptions = get_labels_and_descriptions(list(items_to_get), calc_params.sparql_endpoint)

    # update rowData
    for i in range(len(rowData)):
        item_key = rowData[i]['item']
        if item_key in labels_and_descriptions:
            label = labels_and_descriptions[item_key]['label']
            desc = labels_and_descriptions[item_key]['description']
            rowData[i]['label'] = label
            rowData[i]['description'] = desc

    # qnodes
    for cell, con in qnodes.items():
        for context, context_desc in con.items():
            item_key = context_desc['item']
            if item_key in labels_and_descriptions:
                label = labels_and_descriptions[item_key]['label']
                desc = labels_and_descriptions[item_key]['description']
                qnodes[cell][context]['label'] = label
                qnodes[cell][context]['description'] = desc

    serialized_table = {'qnodes': qnodes, 'rowData': rowData}
    return serialized_table
