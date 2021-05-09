import json
import os
from app_config import DATADIR


class GlobalSettings:
    def __init__(self, datamart_api=None, **kwargs):
        self.datamart_api=datamart_api

    @property
    def settings_path(self):
        return os.path.join(DATADIR, "global_backend_settings.json")

    def save(self):
        with open(self.settings_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(self.__dict__))

    def update(self, **kwargs):
        self.__dict__.update(**kwargs)
        self.save()

    @classmethod
    def load(cls):
        g=GlobalSettings()
        try:
            with open(g.settings_path, 'r',  encoding='utf-8') as f:
                g.__dict__.update(json.load(f))
        except FileNotFoundError:
            pass
        return g

global_settings=GlobalSettings.load()

def datamart_api_endpoint():
    # convenience function
    # DATAMART_API_ENDPOINT = 'https://datamart:datamart-api-789@dsbox02.isi.edu:8888/datamart-api-wm'
    # DATAMART_API_ENDPOINT = 'http://localhost:12543'
    return global_settings.datamart_api
