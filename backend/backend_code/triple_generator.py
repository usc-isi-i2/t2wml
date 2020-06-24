from etk.etk import ETK
from etk.knowledge_graph.schema import KGSchema
from etk.knowledge_graph import URI, Literal, BNode
from etk.etk_module import ETKModule
from etk.wikidata.entity import WDItem
from etk.wikidata.value import Item, Property, StringValue, URLValue, TimeValue, QuantityValue, MonolingualText, \
    ExternalIdentifier, GlobeCoordinate
from etk.wikidata import serialize_change_record, WDReference
from backend_code.utility_functions import get_property_type, translate_precision_to_integer
import backend_code.t2wml_exceptions as T2WMLExceptions

def handle_property_value(attribute, sparql_endpoint):
    property_type=get_property_type(attribute["property"], sparql_endpoint)

    value=None


    if property_type == "WikibaseItem":
        value = Item(str(attribute["value"]))
    elif property_type == "WikibaseProperty":
        value = Property(attribute["value"])
    elif property_type == "String":
        value = StringValue(attribute["value"])
    elif property_type == "Quantity":
    ##	# Quick hack to avoid generating empty or bad qualifiers for quantities -Amandeep
        _value = attribute["value"]
        _value = str(_value).replace(',', '')
        _value_no_decimal = _value.replace('.', '')
        if _value == "":
            value = None
        if _value_no_decimal.isnumeric():
            unit=attribute.get('unit', None)
            if unit:
                value = QuantityValue(_value, Item(unit))
            else:
                value = QuantityValue(_value)
        else:
            value = None
    elif property_type == "Time":
        value = TimeValue(str(attribute["value"]), Item(attribute["calendar"]),
                        translate_precision_to_integer(attribute["precision"]),
                        attribute["time_zone"])
    elif property_type == "Url":
        value = URLValue(attribute["value"])
    elif property_type == "Monolingualtext":
        value = MonolingualText(attribute["value"], attribute["lang"])
    elif property_type == "ExternalId":
        value = ExternalIdentifier(attribute["value"])
    elif property_type == "GlobeCoordinate":
        value = GlobeCoordinate(attribute["latitude"], attribute["longitude"], 
                                attribute["precision"], globe=StringValue('Earth'))
    elif property_type == "Property Not Found":
        raise T2WMLExceptions.MissingWikidataEntryException("Property "+attribute["property"]+" not found")
    else:
        print("Unsupported property type: "+property_type)
        
    return value

def generate_triples(user_id: str, resolved_excel: list, sparql_endpoint: str, filetype: str = 'ttl',
                     created_by: str = 't2wml', debug=False) -> str:
    """
    This function uses ETK to generate the RDF triples
    :param user_id:
    :param resolved_excel:
    :param sparql_endpoint:
    :param filetype:
    :return:
    """
    # initialize
    kg_schema = KGSchema()
    kg_schema.add_schema('@prefix : <http://isi.edu/> .', 'ttl')
    etk = ETK(kg_schema=kg_schema, modules=ETKModule)
    doc = etk.create_document({}, doc_id="http://isi.edu/default-ns/projects")

    # bind prefixes
    doc.kg.bind('wikibase', 'http://wikiba.se/ontology#')
    doc.kg.bind('wd', 'http://www.wikidata.org/entity/')
    doc.kg.bind('wdt', 'http://www.wikidata.org/prop/direct/')
    doc.kg.bind('wdtn', 'http://www.wikidata.org/prop/direct-normalized/')
    doc.kg.bind('wdno', 'http://www.wikidata.org/prop/novalue/')
    doc.kg.bind('wds', 'http://www.wikidata.org/entity/statement/')
    doc.kg.bind('wdv', 'http://www.wikidata.org/value/')
    doc.kg.bind('wdref', 'http://www.wikidata.org/reference/')
    doc.kg.bind('p', 'http://www.wikidata.org/prop/')
    doc.kg.bind('pr', 'http://www.wikidata.org/prop/reference/')
    doc.kg.bind('prv', 'http://www.wikidata.org/prop/reference/value/')
    doc.kg.bind('prn', 'http://www.wikidata.org/prop/reference/value-normalized/')
    doc.kg.bind('ps', 'http://www.wikidata.org/prop/statement/')
    doc.kg.bind('psv', 'http://www.wikidata.org/prop/statement/value/')
    doc.kg.bind('psn', 'http://www.wikidata.org/prop/statement/value-normalized/')
    doc.kg.bind('pq', 'http://www.wikidata.org/prop/qualifier/')
    doc.kg.bind('pqv', 'http://www.wikidata.org/prop/qualifier/value/')
    doc.kg.bind('pqn', 'http://www.wikidata.org/prop/qualifier/value-normalized/')
    doc.kg.bind('skos', 'http://www.w3.org/2004/02/skos/core#')
    doc.kg.bind('prov', 'http://www.w3.org/ns/prov#')
    doc.kg.bind('schema', 'http://schema.org/')


    statement_id = 0
    for cell in resolved_excel:
            statement=resolved_excel[cell]
            _item = statement["item"]
            if _item is not None:
                item = WDItem(_item, creator='http://www.isi.edu/{}'.format(created_by))
                value = handle_property_value(statement, sparql_endpoint)
                if debug:
                    s = item.add_statement(statement["property"], value,
                                        statement_id='debugging-{}'.format(statement_id))
                    statement_id += 1
                else:
                    s = item.add_statement(statement["property"], value)
                doc.kg.add_subject(item)

                if "reference" in statement:
                    reference = WDReference()
                    for attribute in statement["reference"]:
                        value = handle_property_value(attribute, sparql_endpoint)
                        if value:
                            reference.add_value(attribute["property"], value)
                        else:
                            print("Invalid numeric value '{}' in cell {}".format(attribute["value"], attribute["cell"]))
                            print("Skipping qualifier {} for cell {}".format(attribute["property"], cell))
                    if reference:
                        s.add_reference(reference)

                if "qualifier" in statement:
                    for attribute in statement["qualifier"]:
                        value = handle_property_value(attribute, sparql_endpoint)
                        if value:
                            s.add_qualifier(attribute["property"], value)
                        else:
                            print("Invalid numeric value '{}' in cell {}".format(attribute["value"], attribute["cell"]))
                            print("Skipping qualifier {} for cell {}".format(attribute["property"], statement["cell"]))

                doc.kg.add_subject(s)

    
    data = doc.kg.serialize(filetype)
    return data