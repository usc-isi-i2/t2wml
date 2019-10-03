import os
import yaml
import sys
from pathlib import Path
CWD = os.getcwd()
from Code.utility_functions import get_property_type, translate_precision_to_integer
from etk.etk import ETK
from etk.knowledge_graph.schema import KGSchema
from etk.etk_module import ETKModule
from etk.wikidata.entity import WDProperty, WDItem
from etk.wikidata.value import Datatype, Item, Property, StringValue, URLValue, TimeValue, QuantityValue, MonolingualText, ExternalIdentifier, GlobeCoordinate
from etk.wikidata import serialize_change_record


def model_data() -> None:
	"""
	This function generates triples for user defined properties for uploading them to wikidata
	:return:
	"""
	stream = open(Path.cwd().parent / "Datasets/new-property-configuration.yaml", 'r', encoding='utf8')
	yaml_data = yaml.safe_load(stream)
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
	sparql_endpoint = "https://query.wikidata.org/sparql"
	type_map = {
		'quantity': Datatype.QuantityValue,
		'url': URLValue
	}
	property_type_cache = {}
	for k, v in yaml_data.items():
		p = WDProperty(k, type_map[v['type']], creator='http://www.isi.edu/t2wml')
		for lang, value in v['label'].items():
			for val in value:
				p.add_label(val, lang=lang)
		for lang, value in v['description'].items():
			for val in value:
				p.add_description(val, lang=lang)
		for pnode, items in v['statements'].items():
			for item in items:
				try:
					property_type = property_type_cache[pnode]
				except KeyError:
					property_type = get_property_type(pnode, sparql_endpoint)
					property_type_cache[pnode] = property_type
				if property_type == "WikibaseItem":
					value = Item(str(item['value']))
				elif property_type == "WikibaseProperty":
					value = Property(item['value'])
				elif property_type == "String":
					value = StringValue(item['value'])
				elif property_type == "Quantity":
					value = QuantityValue(item['value'])
				elif property_type == "Time":
					value = TimeValue(str(item['value']), Item(item["calendar"]), translate_precision_to_integer(item["precision"]), item["time_zone"])
				elif property_type == "Url":
					value = URLValue(item['value'])
				elif property_type == "Monolingualtext":
					value = MonolingualText(item['value'], item["lang"])
				elif property_type == "ExternalId":
					value = ExternalIdentifier(item['value'])
				elif property_type == "GlobeCoordinate":
					value = GlobeCoordinate(item["latitude"], item["longitude"], item["precision"])

				p.add_statement(pnode, value)

		doc.kg.add_subject(p)

	with open(Path.cwd().parent / "new_properties/result.ttl", "w") as f:
		data = doc.kg.serialize('ttl')
		f.write(data)

#
# model_data()
# with open(Path.cwd().parent / "new_properties/changes.tsv", "w") as fp:
# 	serialize_change_record(fp)



