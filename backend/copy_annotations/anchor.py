from copy_annotations.selection import Selection


class Anchor:
    def __init__(self, content, x_source, y_source, x_target, y_target):
        self.content = content
        self.target_selection = Selection(x_target, x_target, y_target,
                                          y_target)
        self.source_selection = Selection(x_source, x_source, y_source,
                                          y_source)

    def var_name(self, index):
        return f'{self.content}_{index}'
