from app_config import db
from SPARQLWrapper import SPARQLWrapper, JSON
from backend_code.property_type_map import property_type_map

class WikidataProperty(db.Model):
    wikidata_property = db.Column(db.String(64), primary_key=True)
    property_type= db.Column(db.String(64))

    @staticmethod
    def add(wikidata_property, property_type):
        wp=WikidataProperty(wikidata_property=wikidata_property, property_type=property_type)
        db.session.add(wp)
        db.session.commit()


def get_property_type(wikidata_property: str, sparql_endpoint: str) -> str:
    """
    This functions queries the wikidata to find out the type of a wikidata property
    :param wikidata_property:
    :param sparql_endpoint:
    :return:
    """
    try:
        prop = WikidataProperty.query.get(wikidata_property)
        if prop is None:
            raise ValueError("Not found")
        return prop.property_type
    except Exception as e:
        property_type=property_type_map.get(wikidata_property, None)
        if not property_type:
            query = """SELECT ?type WHERE {
                wd:""" + wikidata_property + """ rdf:type wikibase:Property ;
                wikibase:propertyType ?type .
            }"""
            sparql = SPARQLWrapper(sparql_endpoint)
            sparql.setQuery(query)
            sparql.setReturnFormat(JSON)
            results = sparql.query().convert()
            try:
                property_type = results["results"]["bindings"][0]["type"]["value"].split("#")[1]
            except IndexError:
                property_type = "Property Not Found"
        WikidataProperty.add(wikidata_property, property_type)
    return property_type



