import unittest
from Region import Region


class RegionTestCase(unittest.TestCase):

	def test_region_sheet_creation(self):
		region = Region(3, 10, 2, 10)
		self.assertTrue(region.add_hole(5, 5, 8))


if __name__ == '__main__':
	unittest.main()
