from SPARQLWrapper import SPARQLWrapper, JSON

from app_config import DEFAULT_SPARQL_ENDPOINT


wikidata_label_query_cache = {}

def query_wikidata_for_properties(props, sparql_endpoint):
    response=dict()
    if sparql_endpoint == "DO NOT QUERY":
        return response
    properties=' wd:'.join(props)
    properties="wd:"+properties
    query = """SELECT ?wpid ?label ?desc ?type
                WHERE
                {{
                  VALUES ?wpid {{{properties}}}
                ?wpid wikibase:propertyType ?type;
                SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en".
                        ?wpid rdfs:label         ?label.
                        ?wpid schema:description   ?desc.
                    }}
                }}""".format(properties= properties)

    sparql = SPARQLWrapper(sparql_endpoint, agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36')
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
    except Exception as e:
        raise e
    for i in range(len(results["results"]["bindings"])):
        try:
            result = results["results"]["bindings"][i]
            qnode = result["wpid"]["value"].split("/")[-1]
            data_type = result["type"]["value"].split("#")[1]
            label=result["label"]["value"]
            description=results["desc"]["value"]
            response[qnode] = {'label': label, 'description': description, 'data_type':data_type}
        except (IndexError, KeyError):
            pass
    return response

def query_wikidata_for_items(items, sparql_endpoint):
    response=dict()
    if sparql_endpoint == "DO NOT QUERY":
        return response
    items = ' wd:'.join(items)
    items = "wd:" + items

    query = """SELECT ?qnode ?qnodeLabel ?qnodeDescription WHERE
            {{
            VALUES ?qnode {{{items}}}
            SERVICE wikibase:label {{ bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }}
            }}
            """.format(items=items)
    sparql = SPARQLWrapper(sparql_endpoint, agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36')
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
    except Exception as e:
        raise e
    for i in range(len(results["results"]["bindings"])):
        try:
            qnode = results["results"]["bindings"][i]["qnode"]["value"].split(
                "/")[-1]
            label = results["results"]["bindings"][i]["qnodeLabel"]["value"]
            desc = results["results"]["bindings"][i]["qnodeDescription"]["value"]
            response[qnode] = {'label': label, 'description': desc}
        except (IndexError, KeyError):
            pass
    return response


def get_labels_and_descriptions(provider, entities, sparql_endpoint):
    response=dict()
    missing_items={}
    missing_properties={}
    for entity_id in entities:
        try:
            wp=provider.get_entity(entity_id)
            response[entity_id]=wp
        except:
            try:
                int(entity_id[1:])
            except:
                continue #don't bother adding items that are custom/not sparqleable
            if entity_id[0]=="Q":
                missing_items[entity_id]=True
            if entity_id[0]=="P":
                missing_properties[entity_id]=True

    try:
        combined_missing = {**missing_items, **missing_properties}
        if combined_missing:
            if sparql_endpoint=="DO NOT QUERY":
                pass
            else:
                wikidata_label_query_cache.update(combined_missing)
                missing_items=list(combined_missing.keys())
                additional_items = query_wikidata_for_items(missing_items, sparql_endpoint)
                additional_properties = query_wikidata_for_properties(missing_properties, sparql_endpoint)
                combined_additional = {**additional_items, **additional_properties}
                response.update(combined_additional)
                with provider as p:
                    for id in combined_additional:
                        prop_dict=dict(combined_additional[id])
                        data_type=prop_dict.pop("data_type", None)
                        p.save_entry(id, data_type, **prop_dict)


    except Exception as e:  # eg 502 bad gateway error
        print(e)
        pass
    return response




def get_qnode_url(id):
    url=""
    first_letter=str(id).upper()[0]
    try:
        num=int(id[1:])
        if first_letter=="P" and num<10000:
            url="https://www.wikidata.org/wiki/Property:"+id
        if first_letter=="Q" and num<1000000000:
            url="https://www.wikidata.org/wiki/"+id
    except: #conversion to int failed, is not Pnum or Qnum
        pass
    return url

class QNode:
    def __init__(self, id, value, context="", label="", description="", data_type=None):
        self.id = id
        self.value = value
        self.context = context
        self.label = label
        self.description = description
        self.data_type=data_type
        self.url=get_qnode_url(self.id)

    def update(self, label="", description="", **kwargs):
        self.label=label
        self.description=description
        if kwargs.get("data_type"):
            self.data_type = kwargs["data_type"]


countries= {'Q414', 'Q458', 'Q419', 'Q878', 'Q837', 'Q785', 'Q865', 'Q241', 'Q17054', 'Q817', 'Q214', 'Q863', 'Q781', 'Q16641', 'Q965', 'Q854', 'Q1011', 'Q148', 'Q222', 'Q953', 'Q33', 'Q752401', 'Q1410', 'Q917', 'Q1014', 'Q778', 'Q750', 'Q760', 'Q1020', 'Q1019', 'Q423', 'Q37', 'Q232', 'Q9676', 'Q916', 'Q902',
'Q424', 'Q229', 'Q826', 'Q833', 'Q1028', 'Q238', 'Q126125', 'Q45', 'Q929', 'Q790', 'Q115', 'Q1246',
'Q763', 'Q846', 'Q766', 'Q1039', 'Q16502', 'Q183', 'Q25279', 'Q41', 'Q191', 'Q23635', 'Q34020', 'Q928', 'Q912', 'Q29999', 'Q924', 'Q262', 'Q672', 'Q114', 'Q159', 'Q754', 'Q948', 'Q223', 'Q219060', 'Q252', 'Q25305', 'Q822', 'Q819', 'Q79', 'Q678', 'Q230', 'Q858', 'Q399', 'Q1034173', 'Q392770', 'Q851', 'Q142', 'Q842', 'Q334', 'Q31', 'Q28', 'Q686', 'Q17050654', 'Q756617', 'Q881', 'Q143487', 'Q657', 'Q1433120', 'Q1041', 'Q242', 'Q1013', 'Q3769', 'Q977', 'Q398', 'Q96', 'Q236', 'Q1000', 'Q1006', 'Q664609', 'Q8646', 'Q1008', 'Q30971', 'Q805', 'Q33946', 'Q878309', 'Q7184', 'Q77', 'Q347', 'Q407199', 'Q34', 'Q884', 'Q954', 'Q971', 'Q403', 'Q1032', 'Q20', 'Q39', 'Q1005', 'Q810', 'Q697', 'Q945', 'Q774',
'Q43', 'Q27', 'Q1033', 'Q711', 'Q730', 'Q1029', 'Q18221', 'Q889', 'Q298', 'Q804', 'Q16644', 'Q1025', 'Q14773', 'Q221', 'Q786', 'Q813', 'Q16635', 'Q215', 'Q15180', 'Q16', 'Q702', 'Q771405', 'Q23681', 'Q796', 'Q970', 'Q733', 'Q189', 'Q695', 'Q29', 'Q794', 'Q958', 'Q983', 'Q1027', 'Q869', 'Q26273', 'Q26988', 'Q12585', 'Q21203', 'Q155', 'Q49', 'Q736', 'Q792', 'Q1044', 'Q801', 'Q224', 'Q25227', 'Q717', 'Q1037', 'Q213', 'Q1050', 'Q237', 'Q1009', 'Q739', 'Q963', 'Q17', 'Q8268', 'Q36', 'Q217', 'Q212', 'Q227', 'Q265', 'Q1042', 'Q132959', 'Q33788', 'Q3111454', 'Q921', 'Q1183', 'Q691', 'Q218', 'Q874', 'Q117', 'Q1049', 'Q836', 'Q1007', 'Q228', 'Q734', 'Q710', 'Q783', 'Q800', 'Q235', 'Q574', 'Q709', 'Q40', 'Q668', 'Q211', 'Q11703', 'Q233', 'Q258', 'Q42314', 'Q27275', 'Q769', 'Q712', 'Q685', 'Q1045', 'Q4628', 'Q25228', 'Q1030', 'Q784', 'Q219', 'Q664', 'Q843', 'Q35', 'Q184', 'Q408', 'Q683', 'Q974', 'Q986', 'Q1016', 'Q5785', 'Q17070', 'Q225', 'Q30', 'Q38', 'Q32', 'Q811', 'Q967', 'Q145', 'Q962', 'Q757', 'Q244', 'Q1036'}

countries_dict = query_wikidata_for_items(countries, DEFAULT_SPARQL_ENDPOINT)

import json
with open(r"C:\Users\devora\C_sources\pedro\countries.json", 'w', encoding="utf-8") as f:
    f.write(json.dumps(countries_dict, sort_keys=True))
