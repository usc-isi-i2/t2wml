import csv
import json
import os
import requests
from io import StringIO
import pandas as pd
import hashlib
from t2wml.outputs.datamart_edges import clean_id as _clean_id
from t2wml.mapping.statement_mapper import PartialAnnotationMapper
from t2wml.api import kgtk_to_dict, t2wml_settings, KnowledgeGraph
from t2wml.wikification.utility_functions import dict_to_kgtk
from causx.cameos import cameos
from causx.coords import coords
from t2wml_web import get_kg, get_layers, get_qnodes_layer

factor_classes = set([
    "AffinityGroups",
    "AgriculturalIndustry",
    "AirPollutionLevels",
    "AirTransportation",
    "AlternativeEnergyIndustry",
    "ArmedForces",
    "AveragePopulationAge",
    "BasicNeeds",
    "BusinessAndIndustryInfluence",
    "CentralOrLocalGovernment",
    "CivilMilitaryOperations",
    "CommunicationRestrictions",
    "Consumption",
    "Corruption",
    "CriminalActivities",
    "DefenseInformation",
    "Distribution",
    "Economic",
    "EconomicProduction-GDP",
    "EconomicSanctions",
    "EconomicServicesProduction",
    "EducationAvailability",
    "EmergencyFacilityAvailability",
    "EmploymentLevel",
    "EnvironmentConditions",
    "EthnicTensions",
    "EthnicTensionsInGovt",
    "ExtraJudicialActivity",
    "FoodAndNutritionLevel",
    "ForeignArmsTrade",
    "ForeignInvestment",
    "FreedomOfExpression",
    "FreedomOfReligiousExpression",
    "GovernmentAbilityToAddressBasicNeeds",
    "GovernmentBuildings",
    "GovernmentEffectiveness",
    "GovernmentPolicyActivity",
    "GovernmentStability",
    "GovernmentTransparency",
    "GroundTransportation",
    "Habitability",
    "HealthcareAvailability",
    "HumanTrafficking",
    "IllicitTrade",
    "IncomeInequality",
    "IndustrialEmploymentRate",
    "Industry",
    "Informal",
    "Information",
    "Infrastructure",
    "Institutions",
    "InsurgentsOrSeparatistsActivities",
    "InternallyDisplacedPersons",
    "InternalSecurity",
    "InternationalTrade",
    "InternetServiceAvailability",
    "JudicialActivity",
    "Leadership",
    "LegislativeActivity",
    "LogisticsReadiness",
    "ManufacturingIndustry",
    "MassCommunication",
    "Military",
    "MilitaryActivity",
    "MilitaryAirActivity",
    "MilitaryAirCapability",
    "MilitaryAirReadiness",
    "MilitaryC2Capability",
    "MilitaryCBRNECapability",
    "MilitaryCBRNEReadiness",
    "MilitaryConflict",
    "MilitaryCyberActivity",
    "MilitaryCyberCapability",
    "MilitaryCyberReadiness",
    "MilitaryDeployment",
    "MilitaryGroundActivity",
    "MilitaryGroundCapability",
    "MilitaryGroundReadiness",
    "Military-IndustrialBase",
    "MilitaryInfluenceOnGovernment",
    "MilitaryInformationEnvironmentActivity",
    "MilitaryIntelligenceActivity",
    "MilitaryIntelligenceCapability",
    "MilitaryIntelligenceReadiness",
    "MilitaryLawEnforcement",
    "MilitaryLogisticsCapability",
    "MilitaryNavalActivity",
    "MilitaryNavalCapability",
    "MilitaryNavalReadiness",
    "MilitaryReadiness",
    "MilitaryRecruitment",
    "MilitaryResearchAndDevelopment",
    "MilitarySpaceActivity",
    "MilitarySpaceCapability",
    "MilitarySpaceReadiness",
    "MilitarySpecialOperationsActivity",
    "MilitarySpecialOperationsCapability",
    "MilitarySpecialOperationsReadiness",
    "MilitarySpending",
    "MilitaryTraining",
    "MilitaryWMDActivity",
    "MiningIndustry",
    "NationalArmsProduction",
    "NationalInformation",
    "NonMilitaryInternalSecurityActivity",
    "NonMilitaryInternalSecurityCapability",
    "NonMilitaryInternalSecurityReadiness",
    "PeacekeepingActivity",
    "PetroleumIndustry",
    "Political",
    "PoliticalFrictionOrTension",
    "PoliticalOrganizations",
    "PopulaceEducationLevel",
    "PopulaceSupportForGovernment",
    "PopulaceSupportForMilitary",
    "PopulaceSupportForPolice",
    "PopulationGrowth",
    "PovertyRate",
    "PowerAvailability",
    "Production",
    "ProvisionOfAidOrSupport",
    "PublicFacilities",
    "Refugees",
    "Relations",
    "ReligiousSites",
    "ReligiousTensionsInGovt",
    "ReligiousTensionsInPopulation",
    "Sanctions",
    "SanitaryConditions",
    "SecurityForceAssistance",
    "SecuritySafetyLevel",
    "ServicesIndustry",
    "Social",
    "SocialCohesion",
    "StrategicCommunications",
    "Sustainment",
    "SustenanceManagement",
    "TerrorismFinancing",
    "TerroristActivities",
    "Transportation",
    "TransportationInfrastructure",
    "UnregulatedEconomy",
    "Utilities",
    "UtilitiesInfrastructure",
    "WasteServices",
    "WaterAvailability",
    "WaterTransportation",
    "WealthInequality",
    "WMDCapabilityPursuit"
])

def clean_id(input):
    """the original clean_id function raises an error for empty IDs, which we don't want here"""
    if not input:
        return ""
    return _clean_id(input)

def error_with_func(func=None):
    """wrapper function for debugging purposes only"""
    def wrapper(*args, **kwargs):
        try:
            function_name = func.__func__.__qualname__
        except:
            function_name = func.__qualname__
        try:
            result= func(*args, **kwargs)
            return result
        except Exception as e:
            raise ValueError(f"Error returned from {function_name}: {str(e)}")
    return wrapper


#@error_with_func
def try_get_description(input):
    """try to get description but otherwise default to empty string"""
    provider = t2wml_settings.wikidata_provider
    if not input:
        return ""
    if input[0] in ["P", "Q"]:
        try:
            entry = provider.get_entity(input)
            if entry:
                return entry.get("description", "")
        except Exception as e:
            pass
    return ""


#@error_with_func
def try_get_label(input):
    """try checking if a string is an ID and has a label"""
    provider = t2wml_settings.wikidata_provider
    if not input:
        return input
    if input[0] in ["P", "Q"]:
        try:
            entry = provider.get_entity(input)
            if entry and 'label' in entry:
                return entry['label']
        except Exception as e:
            pass
    return input

#@error_with_func
def get_cells_and_columns(statements, project):
    """get the column titles and the row values for a causx table
    """
    column_titles=["dataset_id", "variable_id", "variable", "main_subject", "main_subject_id", "value",
                    "time","time_precision",
                    "country","country_id","country_cameo", "region_coordinate",
                    "FactorClass","Relevance","Normalizer","Units","DocID",
                    "admin1","admin2","admin3","stated_in","stated_in_id"]
    dict_values=[]
    new_columns=set()
    for cell, statement in statements.items():
        variable=try_get_label(statement.get("property", ""))
        main_subject_id=statement.get("subject", "")
        statement_dict=dict(dataset_id=project.dataset_id,
        admin1="", admin2="", admin3="",
        stated_in="", stated_in_id="")

        try:
            statement_dict.update(dict(
            variable=variable,
            variable_id=clean_id(variable),
            value=statement.get("value", "")))
        except Exception as e:
            raise ValueError(str(e)+"195")

        try:
            statement_dict.update(dict(
            main_subject_id=main_subject_id,
            main_subject=try_get_label(main_subject_id),
            country_id=main_subject_id))
        except Exception as e:
            raise ValueError(str(e)+"203")

        try:
            statement_dict.update(dict(
            country_cameo=cameos.get(main_subject_id, ""),
            region_coordinate=coords.get(main_subject_id, ""),
            FactorClass="", Relevance="", Normalizer="", Units="", DocID="", time="", time_precision=""))
        except Exception as e:
            raise ValueError(str(e)+"211")


        for qualifier in statement.get("qualifier", []):
            if not qualifier.get("property"):
                continue
            if qualifier["property"]=="P585": #time, time_precision
                statement_dict["time"]=qualifier["value"]
                statement_dict["time_precision"]=qualifier.get("precision", "")
            elif qualifier["property"]=="P248": #stated_in, stated_in_id
                stated_in_val=try_get_label(qualifier["value"])
                statement_dict["stated_in"]=stated_in_val
                if stated_in_val!=qualifier["value"]:
                    statement_dict["stated_in_id"]=qualifier["value"]

            else:
                q_label=try_get_label(qualifier["property"])
                if q_label not in new_columns:
                    new_columns.add(q_label)
                statement_dict[q_label]=qualifier["value"]

        entities=causx_get_variable_dict(project)
        if statement.get("property"):
            variable_entry=entities.get(statement["property"], None)
            if variable_entry:
                tags=variable_entry.get("tags", {})
                for label, value in tags.items():
                    statement_dict[label]=value
                    if label not in ["FactorClass","Relevance","Normalizer","Units","DocID"]:
                        new_columns.add(label)
        dict_values.append(statement_dict)

    new_columns=list(new_columns)
    column_titles+=new_columns
    return column_titles, dict_values

#@error_with_func
def causx_create_canonical_spreadsheet(statements, project):
    """create canonical spreadsheet for download"""
    column_titles, dict_values = get_cells_and_columns(statements, project)

    string_stream = StringIO("", newline="")
    writer = csv.DictWriter(string_stream, column_titles,
                             restval="",
                             lineterminator="\n",
                             escapechar="",
                             #quotechar='',
                             dialect=csv.unix_dialect,
                             #quoting=csv.QUOTE_NONE
                             )
    writer.writeheader()
    for entry in dict_values:
        dict_columns=set(entry.keys())
        extra_columns=dict_columns-set(column_titles)
        writer.writerow(entry)

    output = string_stream.getvalue()
    string_stream.close()
    return output

#@error_with_func
def df_to_table(df, columns):
    """convert dataframe to table for frontend

    Args:
        df (Dataframe): dataframe to be converted
        columns (list): column titles

    Returns:
        dict: tableDTO
    """

    df = df.filter(columns)
    df.drop(['variable_id', 'main_subject_id', 'stated_in', 'stated_in_id', 'admin1', 'admin2', 'admin3'], axis=1, errors='ignore')
    nan_value = float("NaN")
    df.replace("", nan_value, inplace=True)
    df.dropna(how='all', axis=1, inplace=True)
    dims = list(df.shape)
    cells = json.loads(df.to_json(orient="values"))
    cells.insert(0, list(df.columns))
    return dict(dims=dims, firstRowIndex=0, cells=cells)


#@error_with_func
def get_causx_partial_csv(calc_params):
    """causx-specific partial csv. returns all expected headings,
    attempts to fill in information available even if valid statements not present yet
    """
    count = calc_params.part_count

    columns = ["dataset_id", "variable", "main_subject", "value",
                    "time","time_precision",
                    "country","country_id","country_cameo","region_coordinate",
                    "FactorClass","Relevance","Normalizer","Units","DocID"]

    try:
        cell_mapper = PartialAnnotationMapper(calc_params.annotation_path)
    except FileNotFoundError as e:
        df=pd.DataFrame({"dataset_id":[calc_params.project.dataset_id]}, columns=columns)
        return df_to_table(df, columns)


    try:
        kg = KnowledgeGraph.generate(cell_mapper, calc_params.sheet, calc_params.wikifier, count=count)
    except Exception as e:
        raise ValueError(str(e)+"300")

    if not kg.statements: #nonetheless add at least some of the annotation
        df=pd.DataFrame([], columns=columns)
        role_map={"mainSubject":"main_subject", "dependentVar": "value", "property":"variable"}
        for block in cell_mapper.annotation.annotations_array:
            if isinstance(block, list):
                block=block[0]
            if block.role in role_map:
                try:
                    cells=[]
                    (x1, y1),(x2, y2)=block.cell_args
                    for row in range(y1, y2+1):
                        for col in range(x1, x2+1):
                            cells.append(calc_params.sheet[row, col])
                    df[role_map[block.role]]=cells
                except Exception as e:
                    raise ValueError(str(e)+"320"+block.role)
        df.dataset_id=calc_params.project.dataset_id
    else:
        try:
            columns, dict_values=get_cells_and_columns(kg.statements, calc_params.project)
            df = pd.DataFrame.from_dict(dict_values)
        except Exception as e:
            raise ValueError(str(e)+"341")
    return df_to_table(df, columns)



def causx_get_variable_dict(project):
    """get all of the entities in a given project (for tag management purposes)"""
    entity_dict={}
    for entity_file in project.entity_files:
        entity_dict.update(kgtk_to_dict(project.get_full_path(entity_file)))
    return entity_dict


def include_base_causx_tags(tags):
    """we want to include certain tags no matter what, so add them in here

    Args:
        tags (dict): any existing tags

    Returns:
        dict: any existing tags, and empty tags for the required tags that aren't present
    """
    tags_dict={"FactorClass":"","Relevance":"","Normalizer":"","Units":"","DocID":""}
    tags_dict.update(tags)
    return tags_dict


def causx_set_variable(project, id, updated_fields):
    """update fields for a given variable and save
    """
    variable_dict=causx_get_variable_dict(project)
    variable=variable_dict.get(id, None)

    if variable:
        new_tags = updated_fields.get("tags", {})
        tags = include_base_causx_tags(new_tags)
        filepath=variable_dict['filepath']['value']
        variable.update(updated_fields)
        variable["tags"]=tags
        full_contents = kgtk_to_dict(filepath)
        full_contents[id]=variable
        dict_to_kgtk(full_contents, filepath)
    else:
        raise ValueError("variable not found")
    return variable



def causx_get_variable_metadata(calc_params, statements):
    """get variable metadata used when saving zip results
    """
    properties=set()
    for statement in statements.values():
        property = statement.get("property", None)
        if property:
            properties.add(property)

    variables=causx_get_variable_dict(calc_params.project)
    var_arr=[]
    for property in properties:
        variable = variables.get(property, None)
        if variable:
            var_dict=dict(
               name=variable["label"],
               variable_id=clean_id(variable["label"]),
               description=variable.get("description", ""),
               corresponds_to_property=property,
               tag=variable.get("tags", [])
            )
            var_arr.append(var_dict)
    return var_arr



def create_fidil_json(calc_params):
    """creates the fidil json
    """
    kg = get_kg(calc_params)
    statements=kg.statements
    time_series = dict()
    for cell, statement in statements.items():
        try:
            dataset_id = calc_params.project.dataset_id
            variable_id = statement["property"]
            country = try_get_label(statement["subject"])
            id_str = dataset_id + variable_id + country

            if id_str not in time_series:
                variable_dict=causx_get_variable_dict(calc_params.project).get(variable_id, {})
                tags_dict={"FactorClass":"","Relevance":"","Normalizer":"","DocID":""}
                tags_dict.update(variable_dict.get("tags", {}))

                factor_class = tags_dict["FactorClass"]
                if factor_class in factor_classes:
                    tags_dict["FactorClass"]="http://ontology.causeex.com/ontology/odps/ICM#"+factor_class
                units = tags_dict.pop("Units", "")
                main_subject_id = statement["subject"]
                id = hashlib.md5(id_str.encode()).hexdigest()
                time_series[id_str] = dict(
                    id=id,
                    country = country,
                    country_cameo=cameos.get(main_subject_id, ""),
                    label = try_get_label(statement["property"]),
                    description = calc_params.project.description + " " + try_get_description(variable_id),
                    excelFile = [calc_params.sheet.data_file_name],
                    sheet=[calc_params.sheet.name.rstrip(".csv")],
                    units = units,
                    structuredDataMapping = tags_dict,
                    structuredData = []
                )

            timestamp=""
            for qualifier in statement.get("qualifier", []):
                if qualifier["property"]=="P585":
                    timestamp=qualifier["value"]
            value=statement.get("value", "")
            if not timestamp or not value:
                print("statement missing value or timestamp")
                continue
            time_series[id_str]["structuredData"].append(dict(timestamp=timestamp, value=value))

        except Exception as e:
            print("Error in cell", cell, str(e))
    return list(time_series.values())




def upload_fidil_json(calc_params):
    """upload fidil json to provided endpoint"""
    fidil_json = create_fidil_json(calc_params)
    fidil_endpoint = os.environ.get("FIDIL_UPLOAD_ENDPOINT")
    if not fidil_endpoint:
        fidil_endpoint = "http://icm-provider:8080/fidil/structured/datasets/upload"
    response = requests.post(fidil_endpoint, json=fidil_json)
    return response.status_code



def causx_get_layers(response, calc_params):
    """causx version of the function, to enable updating qnode layer with tags"""
    get_layers(response, calc_params)
    response["layers"] = causx_edit_qnode_layer(calc_params, response["layers"])

def causx_get_qnodes_layer(calc_params):
    """causx version of the function, to enable updating qnode layer with tags"""
    layers = get_qnodes_layer(calc_params)
    layers = causx_edit_qnode_layer(calc_params, layers)
    return layers

def causx_edit_qnode_layer(calc_params, layers):
    """for qnodes in qnode layer, make sure to also add any tags that exist  + default tags"""
    qnode_entries=layers["qnode"]["entries"]
    variable_dict=causx_get_variable_dict(calc_params.project)
    for entry in qnode_entries:
        id = entry["id"]
        variable=variable_dict.get(id, None)
        if variable:
            entry["tags"]=include_base_causx_tags(variable.get("tags", {}))
    return layers
