from etk.etk import ETK
from etk.knowledge_graph.schema import KGSchema
from etk.knowledge_graph import URI, Literal, BNode
from etk.etk_module import ETKModule
from etk.wikidata.entity import WDItem
from etk.wikidata.value import Item, Property, StringValue, URLValue, TimeValue, QuantityValue, MonolingualText, \
    ExternalIdentifier, GlobeCoordinate
from etk.wikidata import serialize_change_record, WDReference
from backend_code.utility_functions import get_property_type, translate_precision_to_integer

def handle_property_value(j, i, sparql_endpoint):
    property_type=get_property_type(j["property"], sparql_endpoint)

    value=None
    is_error=False
    error_statement=""

    if property_type == "WikibaseItem":
        value = Item(str(j["value"]))
    elif property_type == "WikibaseProperty":
        value = Property(j["value"])
    elif property_type == "String":
        value = StringValue(j["value"])
    elif property_type == "Quantity":
    ##	# Quick hack to avoid generating empty or bad qualifiers for quantities -Amandeep
        _value = j["value"]
        _value = str(_value).replace(',', '')
        _value_no_decimal = _value.replace('.', '')
        if _value == "":
            value = None
        if _value_no_decimal.isnumeric():
            if 'unit' in i['statement'] and i['statement']['unit'] is not None:
                value = QuantityValue(_value, Item(i['statement']['unit']))
            else:
                value = QuantityValue(_value)
        else:
            value = None
    elif property_type == "Time":
        value = TimeValue(str(j["value"]), Item(j["calendar"]),
                        translate_precision_to_integer(j["precision"]),
                        j["time_zone"])
    elif property_type == "Url":
        value = URLValue(j["value"])
    elif property_type == "Monolingualtext":
        value = MonolingualText(j["value"], j["lang"])
    elif property_type == "ExternalId":
        value = ExternalIdentifier(j["value"])
    elif property_type == "GlobeCoordinate":
        value = GlobeCoordinate(j["latitude"], j["longitude"], 
                                j["precision"], globe=StringValue('Earth'))
    elif property_type == "Property Not Found":
        is_error = True
        error_statement = "Type of property " + j["property"] + " not found"

    return value, is_error, error_statement

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

    is_error = False
    error_statement = None
    statement_id = 0
    for i in resolved_excel:
        _item = i["statement"]["item"]
        if _item is not None:
            item = WDItem(_item, creator='http://www.isi.edu/{}'.format(created_by))
            value, is_error, error_statement = handle_property_value(i["statement"], i, sparql_endpoint)
            if is_error:
                break
            if debug:
                s = item.add_statement(i["statement"]["property"], value,
                                       statement_id='debugging-{}'.format(statement_id))
                statement_id += 1
            else:
                s = item.add_statement(i["statement"]["property"], value)
            doc.kg.add_subject(item)

            if "reference" in i["statement"]:
                reference = WDReference()
                for j in i["statement"]["reference"]:
                    value, is_error, error_statement = handle_property_value(j, i, sparql_endpoint)
                    if value:
                        reference.add_value(j["property"], value)
                    else:
                        print("Invalid numeric value '{}' in cell {}".format(j["value"], j["cell"]))
                        print("Skipping qualifier {} for cell {}".format(j["property"], i["cell"]))
                if reference:
                    s.add_reference(reference)

            if "qualifier" in i["statement"]:
                for j in i["statement"]["qualifier"]:
                    value, is_error, error_statement = handle_property_value(j, i, sparql_endpoint)
                    if value:
                        s.add_qualifier(j["property"], value)
                    else:
                        print("Invalid numeric value '{}' in cell {}".format(j["value"], j["cell"]))
                        print("Skipping qualifier {} for cell {}".format(j["property"], i["cell"]))

            doc.kg.add_subject(s)
    if not is_error:
        data = doc.kg.serialize(filetype)
    else:
        raise Exception(error_statement)

    return data