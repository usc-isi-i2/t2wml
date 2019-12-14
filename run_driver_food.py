from driver import run_t2wml

wikified_output_path = '/Users/amandeep/Github/ethiopia-experiment/restricted/wikifier.csv'
t2wml_spec = '/Users/amandeep/Github/ethiopia-experiment/restricted/food_prices/t2wml_spec_food_prices_price.yaml'
output_directory = '/Users/amandeep/Github/ethiopia-experiment/restricted/food_prices/output'
sparql_endpoint = 'https://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'


data_file_path = '/Users/amandeep/Github/ethiopia-experiment/restricted/food_prices/input/wfp_food_prices_ethiopia-item-name.csv'

run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)