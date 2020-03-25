from app_config import db
from SPARQLWrapper import SPARQLWrapper, JSON
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
        property_type = WikidataProperty.query.get(wikidata_property)
    except Exception as e:
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
            WikidataProperty.add(wikidata_property, property_type)
        except IndexError:
            property_type = "Property Not Found"

    return property_type