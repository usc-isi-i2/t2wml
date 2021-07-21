import json
import os

import pandas as pd

from copy_annotations.selection import Selection
from copy_annotations.sheet import Sheet

files_dir = os.path.join(os.path.dirname(__file__), "files_for_tests", "copy_annotations")

source_df = pd.read_excel(os.path.join(files_dir,'data.xlsx'), sheet_name='india_wheat', engine='openpyxl', index_col=None, header=None)
with open(os.path.join(files_dir,'source_india_wheat.json')) as f:
    source_annotations = json.load(f)


def test_find_anchors():
    target_df = pd.read_excel(os.path.join(files_dir,'data.xlsx'), sheet_name='usa_wheat', engine='openpyxl', index_col=None, header=None)

    source = Sheet(source_df, source_annotations)

    anchors = source.find_anchors(target_df)

    expected_anchors = [{'content': 'Data Last Updated on:', 'x_source': 1, 'x_target': 0, 'y_source': 1, 'y_target': 0},
                        {'content': '03 Apr 2019 (This data may be subject to revisions)', 'x_source': 2, 'x_target': 1, 'y_source': 1, 'y_target': 0},
                        {'content': 'COMMODITY:', 'x_source': 1, 'x_target': 0, 'y_source': 3, 'y_target': 2},
                        {'content': 'Supply and Demand Balance', 'x_source': 1, 'x_target': 0, 'y_source': 7, 'y_target': 6},
                        {'content': 'National Marketing Year (NMY):', 'x_source': 1, 'x_target': 0, 'y_source': 9, 'y_target': 8},
                        {'content': ' UNBALANCED = (TOTAL UTILIZATION) - (TOTAL SUPPLY)', 'x_source': 1, 'x_target': 0, 'y_source': 22, 'y_target': 21},
                        {'content': 'International Trade Year (ITY):', 'x_source': 1, 'x_target': 0, 'y_source': 25, 'y_target': 24},
                        {'content': 'July/June', 'x_source': 2, 'x_target': 1, 'y_source': 25, 'y_target': 24},
                        {'content': 'Imports (ITY) ', 'x_source': 1, 'x_target': 0, 'y_source': 27, 'y_target': 26},
                        {'content': 'Exports (ITY) ', 'x_source': 1, 'x_target': 0, 'y_source': 28, 'y_target': 27},
                        {'content': 'For example, in the 2017/18 balance, the ITY refers to the period from July 2017 to June 2018', 'x_source': 1, 'x_target': 0, 'y_source': 29, 'y_target': 28},
                        {'content': 'Other', 'x_source': 1, 'x_target': 0, 'y_source': 31, 'y_target': 30},
                        {'content': 'Population ', 'x_source': 1, 'x_target': 0, 'y_source': 34, 'y_target': 33},
                        {'content': ' 1000s', 'x_source': 2, 'x_target': 1, 'y_source': 34, 'y_target': 33},
                        {'content': 'Per Capita Food Use ', 'x_source': 1, 'x_target': 0, 'y_source': 35, 'y_target': 34},
                        {'content': ' Kg/Yr', 'x_source': 2, 'x_target': 1, 'y_source': 35, 'y_target': 34},
                        {'content': 'Area Planted ', 'x_source': 1, 'x_target': 0, 'y_source': 36, 'y_target': 35},
                        {'content': 'Area Harvested ', 'x_source': 1, 'x_target': 0, 'y_source': 37, 'y_target': 36},
                        {'content': 'Yield ', 'x_source': 1, 'x_target': 0, 'y_source': 38, 'y_target': 37},
                        {'content': ' Tonnes/Ha', 'x_source': 2, 'x_target': 1, 'y_source': 38, 'y_target': 37}]

    assert len(anchors) == len(expected_anchors)
    for i in range(0, len(expected_anchors)):
        actual = anchors[i]
        expected = expected_anchors[i]
        assert actual.content == expected['content']
        assert actual.target_selection.__dict__ == Selection(expected['x_target'] + 1, expected['x_target'] + 1, expected['y_target'] + 1, expected['y_target'] + 1).__dict__
        assert actual.source_selection.__dict__ == Selection(expected['x_source'], expected['x_source'], expected['y_source'], expected['y_source']).__dict__


def test_find_anchors_when_no_anchors_are_present():
    target_df = pd.read_excel(os.path.join(files_dir,'data.xlsx'), sheet_name='e1', engine='openpyxl', index_col=None, header=None)

    source = Sheet(source_df, source_annotations)

    anchors = source.find_anchors(target_df)

    assert not anchors
