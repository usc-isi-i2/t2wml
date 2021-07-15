import pandas as pd

from copy_annotations.anchor import Anchor
from copy_annotations.annotation import Annotation
from copy_annotations.selection import Selection

ANCHOR = 'anchor'

VALID = 'valid'

X = 'x'
Y = 'y'
CONTENT = 'content'


class Sheet:
    transformed_df = None
    transformed_row_map = None
    transformed_column_map = None

    def __init__(self, dataframe: pd.DataFrame, annotations: dict = None):
        self.df = dataframe
        self.transform()
        if annotations:
            self.annotations = [Annotation(annotation) for annotation in annotations]

    def find_anchors(self, target_df):
        anchors = {}
        candidates = self._get_anchors_candidates()

        for y, row in target_df.iterrows():
            for x, value in row.items():
                if isinstance(value, str):
                    for candidate in candidates:
                        if value.lower() == candidate[CONTENT].lower():
                            if anchors.get(value):
                                anchors[value][VALID] = False
                                continue

                            anchors[value] = {
                                ANCHOR: Anchor(value, candidate[X], candidate[Y], x + 1, y + 1),
                                VALID: True
                            }

        return [v[ANCHOR] for k, v in anchors.items() if v[VALID]]

    def _get_anchors_candidates(self):
        candidates = []
        for y, row in self.df.iterrows():
            for x, value in row.items():
                is_annotated = any([a.source_selection.contains(Selection(x + 1, x + 1, y + 1, y + 1)) for a in self.annotations])
                if isinstance(value, str) and not is_annotated:
                    candidates.append({
                        CONTENT: value,
                        X: x + 1,
                        Y: y + 1,
                    })

        return candidates

    def transform(self):
        transformed_df = self.df.dropna(how='all', axis=0).dropna(how='all', axis=1)
        self.transformed_row_map = transformed_df.index
        self.transformed_column_map = transformed_df.columns

        intermediate_target_df = transformed_df.reset_index(drop=True)
        intermediate_target_df.columns = [i for i in range(0, intermediate_target_df.shape[1])]
        self.transformed_df = intermediate_target_df

    def get_row_index(self, index):
        return self.transformed_row_map[index - 1] + 1

    def get_column_index(self, index):
        return self.transformed_column_map[index - 1] + 1
