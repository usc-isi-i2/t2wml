from Code.WikifiedRegion import WikifiedRegion
from collections import OrderedDict


class WikifiedRegionStore:
	def __init__(self):
		self.wikified_regions = OrderedDict()

	def index_region(self, sheet_name: str, wikified_region: WikifiedRegion):
		self.wikified_regions[sheet_name] = wikified_region

	def get_wikified_region(self, sheet_name):
		return self.wikified_regions.get(sheet_name, None)