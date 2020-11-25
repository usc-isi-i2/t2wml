from SPARQLWrapper import SPARQLWrapper, JSON
from wikidata_models import WikidataEntity

wikidata_label_query_cache = {} 

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


def get_labels_and_descriptions(items, sparql_endpoint):
    response = dict()
    missing_items = {}
    for item in items:
        wp = WikidataEntity.query.filter_by(wd_id=item).first()
        if wp:
            label = desc = ""
            if wp.label:
                label = wp.label
                if wp.description:
                    desc = wp.description
                response[item] = dict(label=label, description=desc)
            else:
                if item not in wikidata_label_query_cache:
                    missing_items[item]=True
        else:
            if item not in wikidata_label_query_cache:
                missing_items[item]=True
    try:
        if missing_items:
            wikidata_label_query_cache.update(missing_items)
            missing_items=list(missing_items.keys())
            additional_items = query_wikidata_for_label_and_description(
                missing_items, sparql_endpoint)
            response.update(additional_items)
            try:
                for item in additional_items:
                    WikidataEntity.add_or_update(item, do_session_commit=False, **additional_items[item])
            except Exception as e:
                print(e)
            WikidataEntity.do_commit()

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
        