X1 = 'x1'
X2 = 'x2'
Y1 = 'y1'
Y2 = 'y2'


class Selection:
    def __init__(self, x1, x2, y1, y2):
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2

    @staticmethod
    def from_dict(selection_dict):
        return Selection(selection_dict[X1], selection_dict[X2], selection_dict[Y1], selection_dict[Y2])

    def contains(self, another_selection):
        return (self.x1 <= another_selection.x1 <= another_selection.x2 <= self.x2) and (
                self.y1 <= another_selection.y1 <= another_selection.y2 <= self.y2)

    def is_common_x_selection(self, another_selection):
        return (self.x1 <= another_selection.x1 <= self.x2) or (self.x1 <= another_selection.x2 <= self.x2) or (
                another_selection.x1 <= self.x1 <= another_selection.x2) or (another_selection.x1 <= self.x2 <= another_selection.x2)

    def is_common_y_selection(self, another_selection):
        return (self.y1 <= another_selection.y1 <= self.y2) or (self.y1 <= another_selection.y2 <= self.y2) or (
                another_selection.y1 <= self.y1 <= another_selection.y2) or (another_selection.y1 <= self.y2 <= another_selection.y2)
