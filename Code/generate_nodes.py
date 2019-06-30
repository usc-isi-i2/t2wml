import os
import yaml
import sys
from pathlib import Path
CWD = os.getcwd()
from Code.utility_functions import get_property_type
# sys.path.insert(0, Path(CWD + "/etk"))
from etk.etk import ETK
from etk.knowledge_graph.schema import KGSchema
from etk.etk_module import ETKModule
from etk.wikidata.entity import WDProperty, WDItem
from etk.wikidata.value import Datatype, Item, Property, StringValue, URLValue, TimeValue, QuantityValue, MonolingualText, ExternalIdentifier, GlobeCoordinate


def model_data():
	stream = open(Path(CWD + "/Datasets/data.worldbank.org/new_items_properties.yaml"), 'r')
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

	type_map={
		'quantity': Datatype.QuantityValue,
		'url': URLValue
	}
	for k, v in yaml_data.items():
		p = WDProperty(k, type_map[v['type']])
		for lang, value in v['label'].items():
			for val in value:
				p.add_label(val, lang=lang)
		for lang, value in v['description'].items():
			for val in value:
				p.add_description(val, lang=lang)
		for pnode, items in v['statements'].items():
			for item in items:
				if pnode == 'P1896':
					p.add_statement(pnode, URLValue(item['value']))
				else:
					p.add_statement(pnode, Item(item['value']))
		doc.kg.add_subject(p)

	print(doc.kg.serialize('ttl'))

	# # first we add properties and entities
	# # Define Qnode for properties related to crime.
	# q = WDItem('D1001')
	# q.add_label('Wikidata property related to crime', lang='en')
	# q.add_statement('P279', Item('Q22984475'))
	# q.add_statement('P1269', Item('Q83267'))
	# doc.kg.add_subject(q)
	#
	# # violent crime offenses
	# p = WDProperty('C3001', Datatype.QuantityValue)
	# p.add_label('violent crime offenses', lang='en')
	# p.add_description(
	# 	"number of violent crime offenses reported by the sheriff's office or county police department", lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q1520311'))
	# doc.kg.add_subject(p)
	#
	# # murder and non - negligent manslaughter
	# p = WDProperty('C3002', Datatype.QuantityValue)
	# p.add_label('murder and non-negligent manslaughter', lang='en')
	# p.add_description(
	# 	"number of murder and non-negligent manslaughter offenses reported by the sheriff's office or county police department",
	# 	lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q1295558'))
	# p.add_statement('P1629', Item('Q132821'))
	# doc.kg.add_subject(p)
	#
	# # Rape(revised definition)
	# p = WDProperty('C3003', Datatype.QuantityValue)
	# p.add_label('Rape (revised definition)', lang='en')
	# p.add_description(
	# 	"number of rapes (revised definition) reported by the sheriff's office or county police department",
	# 	lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q47092'))
	# doc.kg.add_subject(p)
	#
	# # robbery
	# p = WDProperty('C3005', Datatype.QuantityValue)
	# p.add_label('Robbery', lang='en')
	# p.add_description("number of roberies reported by the sheriff's office or county police department", lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q53706'))
	# doc.kg.add_subject(p)
	#
	# # aggravated assault
	# p = WDProperty('C3006', Datatype.QuantityValue)
	# p.add_label('Aggravated assault', lang='en')
	# p.add_description("number of aggravated assaults reported by the sheriff's office or county police department",
	# 				  lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q365680'))
	# p.add_statement('P1629', Item('Q81672'))
	# doc.kg.add_subject(p)
	#
	# # property crime
	# p = WDProperty('C3007', Datatype.QuantityValue)
	# p.add_label('Property crime', lang='en')
	# p.add_description("number of property crimes reported by the sheriff's office or county police department",
	# 				  lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q857984'))
	# doc.kg.add_subject(p)
	#
	# # burglary
	# p = WDProperty('C3008', Datatype.QuantityValue)
	# p.add_label('Burglary', lang='en')
	# p.add_description("number of Burglaries reported by the sheriff's office or county police department",
	# 				  lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q329425'))
	# doc.kg.add_subject(p)
	#
	# # larceny - theft
	# p = WDProperty('C3009', Datatype.QuantityValue)
	# p.add_label('Larceny-theft', lang='en')
	# p.add_description("number of Larceny-theft reported by the sheriff's office or county police department",
	# 				  lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q2485381'))
	# p.add_statement('P1629', Item('Q2727213'))
	# doc.kg.add_subject(p)
	#
	# # motor vehicle theft
	# p = WDProperty('C3010', Datatype.QuantityValue)
	# p.add_label('Motor vehicle theft', lang='en')
	# p.add_description("number of Motor vehicle thefts reported by the sheriff's office or county police department",
	# 				  lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q548007'))
	# p.add_statement('P1629', Item('Q2727213'))
	# doc.kg.add_subject(p)
	#
	# # arson
	# p = WDProperty('C3011', Datatype.QuantityValue)
	# p.add_label('Arson', lang='en')
	# p.add_description("number of arsons reported by the sheriff's office or county police department", lang='en')
	# p.add_statement('P31', Item('D1001'))
	# p.add_statement('P1629', Item('Q327541'))
	# doc.kg.add_subject(p)
	#
	# # Offenses are reported for a period of type,
	# # so the quantity needs to be represented in units such as offenses / year
	# unit = WDItem('D1002')
	# unit.add_label('offenses per year', lang='en')
	# unit.add_statement('P31', Item('Q47574'))
	# unit.add_statement('P1629', Item('Q83267'))
	# # doc.kg.add_subject(unit)
	#
	# # we begin to model data extracted
	# for state_year in crime_data:
	# 	print('Modeling data for ' + state_year)
	# 	state, year = state_year.split('_')
	#
	# 	# add year value
	# 	year_value = TimeValue(year, calendar=Item('Q1985727'), precision=Precision.year, time_zone=0)
	#
	# 	# add reference, data source
	# 	download_url = 'https://ucr.fbi.gov/crime-in-the-u.s/' + str(year) + '/crime-in-the-u.s.-' + str(
	# 		year) + '/tables/table-' + str(self.year_table[int(year)]) + '/table-' + str(
	# 		self.year_table[int(year)]) + '-state-cuts/' + str(state) + '.xls'
	# 	reference = WDReference()
	# 	reference.add_property(URI('P248'), URI('wd:Q8333'))
	# 	reference.add_property(URI('P854'), Literal(download_url))
	#
	# 	for county in crime_data[state_year]:
	#
	# 		# county entity
	# 		Qnode = self.get_QNode(county, state)
	# 		if Qnode is None:
	# 			continue
	# 		q = WDItem(Qnode)
	#
	# 		# add value for each property
	# 		for property in crime_data[state_year][county]:
	# 			self.add_value(q, property, crime_data[state_year][county][property], unit, year_value,
	# 						   reference)
	#
	# 		# add the entity to kg
	# 		doc.kg.add_subject(q)
	# print('\n\nModeling completed!\n\n')
	#
	# # serialization
	# f = open(file_path, 'w')


model_data()