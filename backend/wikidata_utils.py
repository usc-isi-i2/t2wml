from SPARQLWrapper import SPARQLWrapper, JSON
import logging
from utils import basic_debug


wikidata_label_query_cache = {}

@basic_debug
def query_wikidata_for_label_and_description(items, sparql_endpoint):
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
    logging.debug("sending query for query_wikidata_for_label_and_description: "+query)
    results = sparql.query().convert()
    logging.debug("received response for query for query_wikidata_for_label_and_description: "+query)

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

@basic_debug
def get_labels_and_descriptions(provider, items, sparql_endpoint):
    response=dict()
    missing_items={}
    for item in items:
        try:
            wp=provider.get_entity(item)
            response[item]=wp
        except:
            missing_items[item]=True
    try:
        if missing_items:
            wikidata_label_query_cache.update(missing_items)
            missing_items=list(missing_items.keys())
            additional_items = query_wikidata_for_label_and_description(
                missing_items, sparql_endpoint)
            response.update(additional_items)
            with provider as p:
                for item in additional_items:
                    prop_dict=additional_items[item]
                    data_type=prop_dict.pop("data_type", None)
                    p.save_entry(item, data_type, **prop_dict)
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
