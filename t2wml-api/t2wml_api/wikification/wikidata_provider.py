from SPARQLWrapper import SPARQLWrapper, JSON
import json


class WikidataProvider:
    def get_property_type(wikidata_property, *args, **kwargs):
        raise NotImplementedError

    def get_labels_and_descriptions(items, *args, **kwargs):
        raise NotImplementedError
    
    def save_property(property, property_type):
        pass
    
    def save_item(item_id, item_dict):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        pass
    

class SparqlProvider(WikidataProvider):
    '''
    Provides responses to queries purely from sparql. 
    Will fail if item/property not in wikidata
    '''
    def __init__(self, sparql_endpoint, *args, **kwargs):
        self.sparql_endpoint=sparql_endpoint

    def query_wikidata_for_label_and_description(self, items: str):
        items = ' wd:'.join(items)
        items="wd:"+items
        
        query = """PREFIX wd: <http://www.wikidata.org/entity/>
                PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                SELECT ?qnode (MIN(?label) AS ?label) (MIN(?desc) AS ?desc) WHERE { 
                VALUES ?qnode {""" + items + """} 
                ?qnode rdfs:label ?label; <http://schema.org/description> ?desc.
                FILTER (langMatches(lang(?label),"EN"))
                FILTER (langMatches(lang(?desc),"EN"))
                }
                GROUP BY ?qnode"""
        sparql = SPARQLWrapper(self.sparql_endpoint)
        sparql.setQuery(query)
        sparql.setReturnFormat(JSON)
        try:
            results = sparql.query().convert()
        except Exception as e:
            raise e
        response = dict()
        try:
            for i in range(len(results["results"]["bindings"])):
                qnode = results["results"]["bindings"][i]["qnode"]["value"].split("/")[-1]
                label = results["results"]["bindings"][i]["label"]["value"]
                desc = results["results"]["bindings"][i]["desc"]["value"]
                response[qnode] = {'label': label, 'desc': desc}
        except IndexError:
            pass
        return response


    def query_wikidata_for_property_type(self, wikidata_property):
        query = """SELECT ?type WHERE {
                    wd:""" + wikidata_property + """ rdf:type wikibase:Property ;
                    wikibase:propertyType ?type .
                }"""
        sparql = SPARQLWrapper(self.sparql_endpoint)
        sparql.setQuery(query)
        sparql.setReturnFormat(JSON)
        results = sparql.query().convert()
        try:
            property_type = results["results"]["bindings"][0]["type"]["value"].split("#")[1]
        except IndexError:
            property_type = "Property Not Found"
        return property_type


    def get_property_type(self, wikidata_property: str):
        property_type=query_wikidata_for_property_type(wikidata_property)
        if property_type=="Property Not Found":
            raise ValueError("Property "+wikidata_property+" not found")
        return property_type

    def get_labels_and_descriptions(self, items: set):
        response=dict()
        new_items=query_wikidata_for_label_and_description(items)
        response.update(new_items)
        return response

    def save_property(self, property, property_type):
        raise NotImplementedError("Cannot save properties to wikidata")
    
    def save_item(self, item_id, item_dict):
        raise NotImplementedError("Cannot save items to wikidata")

class FallbackSparql(SparqlProvider):
    '''
    A class for querying some source, and if the source does not have a response to the query, 
    falling back to sparql queries (and then optionally saving query response to the main source)
    '''
    def get_property_type(self, wikidata_property, *args, **kwargs):
        try:
            property_type=self._get_property_type(wikidata_property, *args, **kwargs)
        except:
            property_type=self.query_wikidata_for_property_type(wikidata_property)
            self.save_property(wikidata_property, property_type)
        return property_type
    
    def get_labels_and_descriptions(self, items, *args, **kwargs):
        response=dict()
        items_not_found=[]
        for item in items:
            try:
                item_dict= self._get_item(item)
                response[item] =  item_dict
            except:
                items_not_found.append(item)
        if items_not_found:
            new_items=query_wikidata_for_label_and_description(items_not_found)
            response.update(new_items)
            for wd_id in new_items:
                item_dict=new_items[wd_id]
                self.save_item(wd_id, item_dict)
        return response
    
    def _get_property_type(self, wikidata_property, *args, **kwargs):
        raise NotImplementedError
    
    def _get_item(self, item, *args, **kwargs):
        raise NotImplementedError
    

class DictionaryProvider(FallbackSparql):
    def __init__(self, ref_dict, sparql_endpoint, *args, **kwargs):
        super().__init__(sparql_endpoint)
        self.ref_dict=ref_dict

    def _get_property_type(self, wikidata_property, *args, **kwargs):
        property_type=self.ref_dict.get(wikidata_property, None)
        if not property_type:
            raise ValueError("Property not found")
        return property_type
    
    def _get_item(self, item, *args, **kwargs):
        item_dict=self.ref_dict.get(item, None)
        if not item_dict:
            raise ValueError("Item not found")
        return item_dict
    
    def save_property(self, property, property_type):
        added=self.ref_dict.get(property, True)
        self.ref_dict[property]=property_type
        return added
    
    def save_item(self, item_id, item_dict):
        self.ref_dict[item_id]=item_dict

class DictionaryFileProvider(DictionaryProvider):
    def __init__(self, file_path, sparql_endpoint, *args, **kwargs):
        with open(file_path, 'r') as f:
            ref_dict=json.load(f)
        super().init(ref_dict, sparql_endpoint)
        self.file_path=file_path
    
    def __exit__(self, exc_type, exc_value, exc_traceback):
        ref_dict_str=json.dumps(self.ref_dict)
        with open(self.file_path, 'w') as f:
            f.write(ref_dict_str)

