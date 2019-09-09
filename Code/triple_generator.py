from pathlib import Path
from etk.etk import ETK
from app_config import app
import os
from etk.knowledge_graph.schema import KGSchema
from etk.etk_module import ETKModule
from etk.wikidata.entity import WDItem
from etk.wikidata.value import Item, Property, StringValue, URLValue, TimeValue, QuantityValue, MonolingualText, ExternalIdentifier, GlobeCoordinate
from etk.wikidata import serialize_change_record
from Code.utility_functions import get_property_type, translate_precision_to_integer
from Code.property_type_map import property_type_map


def generate_triples(user_id: str, resolved_excel: list, sparql_endpoint: str, filetype: str = 'ttl') -> str:
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

	# property_type_cache = {}
	is_error = False
	for i in resolved_excel:
		item = WDItem(i["statement"]["item"],  creator='http://www.isi.edu/t2wml')
		try:
			property_type = property_type_map[i["statement"]["property"]]
		except KeyError:
			property_type = get_property_type(i["statement"]["property"], sparql_endpoint)
			property_type_map[i["statement"]["property"]] = property_type
		if property_type == "WikibaseItem":
			value = Item(str(i["statement"]["value"]))
		elif property_type == "WikibaseProperty":
			value = Property(i["statement"]["value"])
		elif property_type == "String":
			value = StringValue(i["statement"]["value"])
		elif property_type == "Quantity":
			value = QuantityValue(i["statement"]["value"])
		elif property_type == "Time":
			value = TimeValue(str(i["statement"]["value"]), Item(i["statement"]["calendar"]), translate_precision_to_integer(i["statement"]["precision"]), i["statement"]["time_zone"])
		elif property_type == "Url":
			value = URLValue(i["statement"]["value"])
		elif property_type == "Monolingualtext":
			value = MonolingualText(i["statement"]["value"], i["statement"]["lang"])
		elif property_type == "ExternalId":
			value = ExternalIdentifier(i["statement"]["value"])
		elif property_type == "GlobeCoordinate":
			value = GlobeCoordinate(i["statement"]["latitude"], i["statement"]["longitude"], i["statement"]["precision"])
		elif property_type == "Property Not Found":
			is_error = True
			break
		s = item.add_statement(i["statement"]["property"], value)
		doc.kg.add_subject(item)

		if "qualifier" in i["statement"]:
			for j in i["statement"]["qualifier"]:
				try:
					property_type = property_type_map[j["property"]]
				except KeyError:
					property_type = get_property_type(j["property"], sparql_endpoint)
					property_type_map[j["property"]] = property_type
				if property_type == "WikibaseItem":
					value = Item(str(j["value"]))
				elif property_type == "WikibaseProperty":
					value = Property(j["value"])
				elif property_type == "String":
					value = StringValue(j["value"])
				elif property_type == "Quantity":
					value = QuantityValue(j["value"])
				elif property_type == "Time":
					value = TimeValue(str(j["value"]), Item(j["calendar"]), translate_precision_to_integer(j["precision"]), j["time_zone"])
				elif property_type == "Url":
					value = URLValue(j["value"])
				elif property_type == "Monolingualtext":
					value = MonolingualText(j["value"], j["lang"])
				elif property_type == "ExternalId":
					value = ExternalIdentifier(j["value"])
				elif property_type == "GlobeCoordinate":
					value = GlobeCoordinate(j["latitude"], j["longitude"], j["precision"])
				elif property_type == "Property Not Found":
					is_error = True
				s.add_qualifier(j["property"], value)
		doc.kg.add_subject(s)
	if not is_error:
		data = doc.kg.serialize(filetype)
	else:
		data = "Property Not Found"
	# os.makedirs(Path.cwd() / "new_properties", exist_ok=True)
	# results_file_name = user_id + "_results.ttl"
	# changes_file_name = user_id + "_changes.tsv"

	# with open(Path(app.config['downloads']) / results_file_name, "w") as fp:
	# 	fp.write(data)
	# with open(Path(app.config['downloads']) / changes_file_name, "w") as fp:
	# 	serialize_change_record(fp)
	return data
