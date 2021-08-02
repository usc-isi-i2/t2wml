from mip import INTEGER

from copy_annotations.selection import X1, X2, Y1, Y2, Selection


def generate_constraints(v0, v1, index_0, index_1):
    if index_0 < index_1:
        return v0 + 1 <= v1
    elif index_0 > index_1:
        return v1 + 1 <= v0
    else:
        return None


def generate_block_constraints(block_0, block_1, model, is_anchor):
    v0_x1 = model.var_by_name(name=block_0.var_name(X1))
    v0_x2 = model.var_by_name(name=block_0.var_name(X2))
    v0_y1 = model.var_by_name(name=block_0.var_name(Y1))
    v0_y2 = model.var_by_name(name=block_0.var_name(Y2))

    v1_x1 = model.var_by_name(name=block_1.var_name(X1))
    v1_x2 = model.var_by_name(name=block_1.var_name(X2))
    v1_y1 = model.var_by_name(name=block_1.var_name(Y1))
    v1_y2 = model.var_by_name(name=block_1.var_name(Y2))

    if block_0.source_selection.is_common_x_selection(block_1.source_selection) or is_anchor:
        add_valid_constraint(model, generate_constraints(v0_y1, v1_y1, block_0.source_selection.y1, block_1.source_selection.y1))
        add_valid_constraint(model, generate_constraints(v0_y1, v1_y2, block_0.source_selection.y1, block_1.source_selection.y2))
        add_valid_constraint(model, generate_constraints(v0_y2, v1_y1, block_0.source_selection.y2, block_1.source_selection.y1))
        add_valid_constraint(model, generate_constraints(v0_y2, v1_y2, block_0.source_selection.y2, block_1.source_selection.y2))

    if block_0.source_selection.is_common_y_selection(block_1.source_selection) or is_anchor:
        add_valid_constraint(model, generate_constraints(v0_x1, v1_x1, block_0.source_selection.x1, block_1.source_selection.x1))
        add_valid_constraint(model, generate_constraints(v0_x1, v1_x2, block_0.source_selection.x1, block_1.source_selection.x2))
        add_valid_constraint(model, generate_constraints(v0_x2, v1_x1, block_0.source_selection.x2, block_1.source_selection.x1))
        add_valid_constraint(model, generate_constraints(v0_x2, v1_x2, block_0.source_selection.x2, block_1.source_selection.x2))


def add_valid_constraint(model, constraint):
    if constraint:
        model.add_constr(constraint)


def initialize_block(block, model, bound_selection: Selection):
    x1 = model.add_var(name=block.var_name(X1), lb=bound_selection.x1, ub=bound_selection.x2, var_type=INTEGER)
    x2 = model.add_var(name=block.var_name(X2), lb=bound_selection.x1, ub=bound_selection.x2, var_type=INTEGER)
    y1 = model.add_var(name=block.var_name(Y1), lb=bound_selection.y1, ub=bound_selection.y2, var_type=INTEGER)
    y2 = model.add_var(name=block.var_name(Y2), lb=bound_selection.y1, ub=bound_selection.y2, var_type=INTEGER)

    if block.source_selection.x1 == block.source_selection.x2:
        model.add_constr(x1 == x2)
    else:
        model.add_constr(x1 <= x2)

    if block.source_selection.y1 == block.source_selection.y2:
        model.add_constr(y1 == y2)
    else:
        model.add_constr(y1 <= y2)

    return x2 - x1 + y2 - y1
