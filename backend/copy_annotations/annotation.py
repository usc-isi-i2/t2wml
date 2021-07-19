from copy_annotations.selection import Selection

ID = 'id'
LINK = 'link'
LINKS = 'links'
ROLE = 'role'
SELECTION = 'selection'
TYPE = 'type'
PROPERTY = 'property'


class Annotation:
    def __init__(self, annotation_dict):
        self.id = annotation_dict.get(ID)
        self.link = annotation_dict.get(LINK)
        self.links = annotation_dict.get(LINKS)
        self.role = annotation_dict.get(ROLE)
        self.source_selection = Selection.from_dict(annotation_dict[SELECTION])
        self.type = annotation_dict.get(TYPE)
        self.property = annotation_dict.get(PROPERTY)

    def var_name(self, index):
        return f"{self.id}_{index}"

    def generate_target_annotations(self, x1, x2, y1, y2):
        annotation = {
            ID: self.id,
            LINK: self.link,
            LINKS: self.links,
            ROLE: self.role,
            SELECTION: Selection(x1, x2, y1, y2).__dict__,
        }

        if self.type:
            annotation[TYPE] = self.type

        if self.property:
            annotation[PROPERTY] = self.property

        return annotation
