from driver import run_t2wml

ethiopia_repo_path = '/Users/amandeep/Github/ethiopia-experiment'
wikified_output_path = '{}/restricted/wikifier.csv'.format(ethiopia_repo_path)
t2wml_spec = '{}/restricted/flood_data/t2wml_spec_flood_data.yaml'.format(ethiopia_repo_path)
output_directory = '{}/restricted/flood_data/output'.format(ethiopia_repo_path)
sparql_endpoint = 'https://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'

data_file_path = '{}/restricted/flood_data/input/2009.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2010.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2011.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2012.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2013.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2014.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2015.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2016.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2017.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)

data_file_path = '{}/restricted/flood_data/input/2008.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)
