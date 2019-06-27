from app_config import app
import sys
import json
import os
__CWD__ = os.getcwd()
from utility_functions import get_property_type
sys.path.insert(0, app.config['ETK_PATH'])
from etk.etk import ETK
from etk.knowledge_graph.schema import KGSchema
from etk.etk_module import ETKModule
from etk.wikidata.entity import WDProperty, WDItem
from etk.wikidata.value import Datatype, Item, Property, StringValue, URLValue, TimeValue, QuantityValue, MonolingualText, ExternalIdentifier, GlobeCoordinate
sys.path.insert(0, app.config["CODE_FOLDER"])
from handler import main


def model_data(format='ttl'):
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

	resolved_excel = list(json.loads(main()))
	property_type_cache = {}
	for i in resolved_excel:
		item = WDItem(i["statement"]["item"])
		s = item.add_statement(i["statement"]["property"], QuantityValue(i["statement"]["value"]))
		doc.kg.add_subject(item)

		for j in i["statement"]["qualifier"]:
			try:
				property_type = property_type_cache[j["property"]]
			except KeyError:
				property_type = get_property_type(j["property"])
				property_type_cache[j["property"]] = property_type

			if property_type == "WikibaseItem":
				value = Item(str(j["value"]))
			elif property_type == "WikibaseProperty":
				value = Property(j["value"])
			elif property_type == "String":
				value = StringValue(j["value"])
			elif property_type == "Quantity":
				value = QuantityValue(j["value"])
			elif property_type == "Time":
				value = TimeValue(str(j["value"]), Item(j["calendar"]), j["precision"], j["time_zone"])
			elif property_type == "Url":
				value = URLValue(j["value"])
			elif property_type == "Monolingualtext":
				value = MonolingualText(j["value"], j["lang"])
			elif property_type == "ExternalId":
				value = ExternalIdentifier(j["value"])
			elif property_type == "GlobeCoordinate":
				value = GlobeCoordinate(j["latitude"], j["longitude"], j["precision"])

			s.add_qualifier(j["property"], value)
		doc.kg.add_subject(s)
	print(doc.kg.serialize(format))


model_data()
