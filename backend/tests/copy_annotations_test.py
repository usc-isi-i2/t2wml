import json
import os

import pandas as pd
import pytest

from copy_annotations.copy_annotations import copy_annotation

test_cases = [
    {'source_sheet': 'e1', 'target_sheet': 'e1_shifted', 'source_annotation': 'source_e1.json', 'target_annotation': 'expected_e1_shifted.json'},
    {'source_sheet': 'e2', 'target_sheet': 'e2_shifted', 'source_annotation': 'source_e2.json', 'target_annotation': 'expected_e2_shifted.json'},
    {'source_sheet': 'e3', 'target_sheet': 'e3_shifted', 'source_annotation': 'source_e3.json', 'target_annotation': 'expected_e3_shifted.json'},
    # needs anchor for passing test
    {'source_sheet': 'e4', 'target_sheet': 'e4_shifted', 'source_annotation': 'source_e4.json', 'target_annotation': 'expected_e4_shifted.json'},
    {'source_sheet': 'e4', 'target_sheet': 'e4_misaligned', 'source_annotation': 'source_e4.json', 'target_annotation': 'expected_e4_misaligned.json'},
    {'source_sheet': 'e4', 'target_sheet': 'e4_empty_row', 'source_annotation': 'source_e4.json', 'target_annotation': 'source_e4.json'},
    {'source_sheet': 'india_wheat', 'target_sheet': 'india_wheat', 'source_annotation': 'source_india_wheat.json', 'target_annotation': 'expected_india_wheat.json'},
    {'source_sheet': 'india_wheat', 'target_sheet': 'shifted_india_wheat', 'source_annotation': 'source_india_wheat.json', 'target_annotation': 'expected_shifted_india_wheat.json'},
    # needs minimum number of anchor for passing test
    {'source_sheet': 'india_wheat', 'target_sheet': 'shifted_india_wheat_wo_anchors', 'source_annotation': 'source_india_wheat.json','target_annotation': 'expected_shifted_india_wheat_wo_anchors.json'}
]

files_dir = os.path.join(os.path.dirname(__file__), "files_for_tests", "copy_annotations")


def test_all_test_scenarios():
    failed_cases = []
    for test_case in test_cases:
        source_df = pd.read_excel(os.path.join(files_dir,'data.xlsx'), sheet_name=test_case['source_sheet'], engine='openpyxl', index_col=None, header=None)
        target_df = pd.read_excel(os.path.join(files_dir,'data.xlsx'), sheet_name=test_case['target_sheet'], engine='openpyxl', index_col=None, header=None)

        with open(os.path.join(files_dir,test_case['source_annotation'])) as f:
            source_annotations = json.load(f)

        with open(os.path.join(files_dir, test_case['target_annotation'])) as f:
            target_annotations = json.load(f)

        try:
            annotations = copy_annotation(source_annotations, source_df, target_df)
            assert annotations == target_annotations
        except AssertionError as e:
            failed_cases.append((test_case, e))

    error_message = f"Unmatched copy_annotations: {[failed_case['target_annotation'] for failed_case, e in failed_cases]}"
    assert len(failed_cases) == 0, error_message


def test_annotator():
    test_case = {'source_sheet': 'e4', 'target_sheet': 'e4_empty_row', 'source_annotation': 'source_e4.json', 'target_annotation': 'source_e4.json'}

    source_df = pd.read_excel(os.path.join(files_dir,'data.xlsx'), sheet_name=test_case['source_sheet'], engine='openpyxl', index_col=None, header=None)
    target_df = pd.read_excel(os.path.join(files_dir,'data.xlsx'), sheet_name=test_case['target_sheet'], engine='openpyxl', index_col=None, header=None)

    with open(os.path.join(files_dir,test_case['source_annotation'])) as f:
        source_annotations = json.load(f)

    with open(os.path.join(files_dir, test_case['target_annotation'])) as f:
        expected_target_annotations = json.load(f)

    annotations = copy_annotation(source_annotations, source_df, target_df)

    assert annotations == expected_target_annotations


def test_annotator_when_annotations_transfer_fails():
    test_case = {'source_sheet': 'e4', 'target_sheet': 'e4_empty_row','source_annotation': 'source_e4.json','target_annotation': 'source_e4.json'}

    source_df = pd.read_excel(os.path.join(files_dir, 'data.xlsx'), sheet_name=test_case['source_sheet'], engine='openpyxl', index_col=None, header=None)

    with open(os.path.join(files_dir,test_case['source_annotation'])) as f:
        source_annotations = json.load(f)

    with pytest.raises(Exception) as exec_info:
        copy_annotation(source_annotations, source_df, pd.DataFrame())

    assert exec_info.value.args[0] == 'Non feasible block constraints'
