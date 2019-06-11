

#under-development

class RegionNode:
    def __init__(self):
        self.left = None
        self.right = None
        self.top = None
        self.bottom = None
        self.next = None
        self.previous = None
    
    def __init__(self, left: tuple, right: tuple, top: tuple, bottom: tuple, next: tuple, previous: tuple):
        self.left = left
        self.right = right
        self.top = top
        self.bottom = bottom
        self.next = next
        self.previous = previous
