from SPARQLWrapper import SPARQLWrapper, JSON


wikidata_label_query_cache = {}

def query_wikidata_for_properties(props, sparql_endpoint):
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
                }}""".format(properties)

    sparql = SPARQLWrapper(sparql_endpoint, agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36')
    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    try:
        results = sparql.query().convert()
    except Exception as e:
        raise e
    response = dict()
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
    response = dict()
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
            if entity_id[0]=="Q":
                missing_items[entity_id]=True
            if entity_id[0]=="P":
                missing_properties[entity_id]=True

    try:
        combined_missing = missing_items | missing_properties
        if combined_missing:
            wikidata_label_query_cache.update(combined_missing)
            missing_items=list(combined_missing.keys())
            additional_items = query_wikidata_for_items(missing_items, sparql_endpoint)
            additional_properties = query_wikidata_for_properties(missing_properties, sparql_endpoint)
            combined_additional = additional_items | additional_properties
            response.update(combined_additional)
            with provider as p:
                for id in combined_additional:
                    prop_dict=dict(combined_additional[id])
                    data_type=prop_dict.pop("data_type", None)
                    p.save_entry(id, data_type, **prop_dict)


    except:  # eg 502 bad gateway error
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
    def __init__(self, id, value, context="", label="", description=""):
        self.id = id
        self.value = value
        self.context = context
        self.label = label
        self.description = description
        self.url=get_qnode_url(self.id)

    def update(self, label="", description="", **kwargs):
        self.label=label
        self.description=description
