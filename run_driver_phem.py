from driver import run_t2wml

ethiopia_repo_path = '/Users/amandeep/Github/ethiopia-experiment'
wikified_output_path = '{}/restricted/wikifier.csv'.format(ethiopia_repo_path)
t2wml_spec = '{}/restricted/phem/t2wml_spec_oromia_phem.yaml'.format(ethiopia_repo_path)
output_directory = '{}/restricted/phem/output'.format(ethiopia_repo_path)
sparql_endpoint = 'https://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'

data_file_path = '{}/restricted/phem/input/phem_original_monthly.xlsx'.format(ethiopia_repo_path)

run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)
