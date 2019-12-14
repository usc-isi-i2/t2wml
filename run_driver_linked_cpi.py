from driver import run_t2wml

ethiopia_repo_path = '/Users/amandeep/Github/ethiopia-experiment'
data_file_path = '{}/restricted/linked_cpi/Linked CPI.xlsx'.format(ethiopia_repo_path)
wikified_output_path = '{}/restricted/wikifier.csv'.format(ethiopia_repo_path)
t2wml_spec = '{}/restricted/linked_cpi/t2wml_spec.yaml'.format(ethiopia_repo_path)
output_directory = '{}/restricted/linked_cpi'.format(ethiopia_repo_path)
sheet_name = 'Non-Food'
sparql_endpoint = 'http://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'

run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sheet_name=sheet_name,
          sparql_endpoint=sparql_endpoint)
