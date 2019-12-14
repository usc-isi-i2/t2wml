from driver import run_t2wml

ethiopia_repo_path = '/Users/amandeep/Github/ethiopia-experiment'
wikified_output_path = '{}/restricted/wikifier.csv'.format(ethiopia_repo_path)
t2wml_spec_1 = '{}/restricted/precipitation/t2wml_spec_oromia_precipitation_1.yaml'.format(ethiopia_repo_path)
t2wml_spec_2 = '{}/restricted/precipitation/t2wml_spec_oromia_precipitation_2.yaml'.format(ethiopia_repo_path)
output_directory = '{}/restricted/precipitation/output'.format(ethiopia_repo_path)
sparql_endpoint = 'https://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'


data_file_path = '{}/restricted/precipitation/input/gpm_precipitation.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec_1, output_directory, sparql_endpoint=sparql_endpoint)


data_file_path = '{}/restricted/precipitation/input/gpm_precipitation_2018_2019.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec_2, output_directory, sparql_endpoint=sparql_endpoint)
