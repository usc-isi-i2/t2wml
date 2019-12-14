from driver import run_t2wml

ethiopia_repo_path = '/Users/amandeep/Github/ethiopia-experiment'
wikified_output_path = '/restricted/wikifier.csv'

output_directory = '{}/restricted/food_prices/output'.format(ethiopia_repo_path)
sparql_endpoint = 'https://dsbox02.isi.edu:8899/bigdata/namespace/wdq/sparql'


data_file_path = '{}/restricted/food_prices/input/wfp_food_prices_ethiopia-item-name.csv'.format(ethiopia_repo_path)
t2wml_spec = '{}/restricted/food_prices/t2wml_spec_food_prices_price.yaml'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)


t2wml_spec = '{}/restricted/food_prices/t2wml_spec_food_prices_markets.yaml'.format(ethiopia_repo_path)
data_file_path = '{}/restricted/food_prices/input/wfp_food_prices_ethiopia-item-name-market.csv'.format(ethiopia_repo_path)
run_t2wml(data_file_path, wikified_output_path, t2wml_spec, output_directory, sparql_endpoint=sparql_endpoint)