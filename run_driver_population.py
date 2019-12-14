from driver import run_t2wml

ethiopia_repo_path = '/Users/amandeep/Github/ethiopia-experiment'

population_datasets = {
    '2. Population': '{}/restricted/oromia_population/t2wml_spec_population.yaml'.format(ethiopia_repo_path),
    '11.Migrant_characterstics ': '{}/restricted/oromia_population/t2wml_spec_migrant_characteristics.yaml'.format(ethiopia_repo_path),
    '15. Employment_status': '{}/restricted/oromia_population/t2wml_spec_employment_status.yaml'.format(ethiopia_repo_path),
    '16. Unemployment_rate': '{}/restricted/oromia_population/t2wml_spec_unemployment_rate.yaml'.format(ethiopia_repo_path),
    '21. Drinking_water': '{}/restricted/oromia_population/t2wml_spec_drinking_water.yaml'.format(ethiopia_repo_path),
    '22. Toilet_facility': '{}/restricted/oromia_population/t2wml_spec_toilet_facility.yaml'.format(ethiopia_repo_path),
    '23.Fuel_types': '{}/restricted/oromia_population/t2wml_spec_fuel_types.yaml'.format(ethiopia_repo_path),
    '25. Waste_disposal_types': '{}/restricted/oromia_population/t2wml_spec_waste_disposal_types.yaml'.format(ethiopia_repo_path)
}
data_file_path = '{}/restricted/oromia_population/Population_Housing_Census_Atlas_of_Ethiopia_2007.xls'.format(ethiopia_repo_path)
wikified_output_path = '{}/restricted/wikifier.csv'.format(ethiopia_repo_path)

output_directory = '{}/restricted/oromia_population'.format(ethiopia_repo_path)
sparql_endpoint = 'http://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'

for k in population_datasets:
    print('processing: {}'.format(k))
    sheet_name = k
    t2wml_spec = population_datasets[k]
    run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sheet_name=sheet_name,
              sparql_endpoint=sparql_endpoint)


