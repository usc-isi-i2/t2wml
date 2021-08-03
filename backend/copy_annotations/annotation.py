from copy_annotations.selection import Selection

ID = 'id'
SELECTION = 'selection'


class Annotation:
    def __init__(self, annotation_dict):
        self.id = annotation_dict.get(ID)
        self.source_selection = Selection.from_dict(annotation_dict[SELECTION])
        self.annotation = annotation_dict

    def var_name(self, index):
        return f"{self.id}_{index}"

    def generate_target_annotations(self, x1, x2, y1, y2):
        annotation = self.annotation
        annotation[SELECTION] = Selection(x1, x2, y1, y2).__dict__
        return annotation
