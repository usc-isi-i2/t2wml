from copy_annotations.selection import Selection


def test_is_common_selection_when_no_overlap():
    selection_one = Selection(2, 4, 2, 4)
    selection_two = Selection(6, 8, 6, 8)

    assert selection_one.is_common_x_selection(selection_two) is False
    assert selection_one.is_common_x_selection(selection_two) is False

    assert selection_one.is_common_y_selection(selection_two) is False
    assert selection_two.is_common_y_selection(selection_one) is False


def test_is_common_selection_when_one_selection_contains_another():
    selection_one = Selection(2, 8, 2, 8)
    selection_two = Selection(4, 6, 4, 6)

    assert selection_one.is_common_x_selection(selection_two) is True
    assert selection_two.is_common_x_selection(selection_one) is True

    assert selection_one.is_common_y_selection(selection_two) is True
    assert selection_two.is_common_y_selection(selection_one) is True


def test_is_common_selection_when_partial_overlap():
    selection_one = Selection(2, 6, 2, 6)
    selection_two = Selection(4, 8, 4, 8)

    assert selection_one.is_common_x_selection(selection_two) is True
    assert selection_two.is_common_x_selection(selection_one) is True

    assert selection_one.is_common_y_selection(selection_two) is True
    assert selection_two.is_common_y_selection(selection_one) is True
