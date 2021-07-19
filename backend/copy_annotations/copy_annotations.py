from itertools import combinations

from mip import Model, MAXIMIZE, CBC, maximize, OptimizationStatus

from copy_annotations.selection import X1, X2, Y1, Y2, Selection
from copy_annotations.sheet import Sheet
from copy_annotations.utils import generate_block_constraints, initialize_block

# To debug infeasible model
# from src import conflict
# from src.conflict import ConflictFinder


def copy_annotation(source_annotation, source_df, target_df):
    source = Sheet(source_df, source_annotation)
    target = Sheet(target_df)

    model = Model(sense=MAXIMIZE, solver_name=CBC)
    objective_expressions = []

    bounded_selection = Selection(1, target.transformed_df.shape[1], 1, target.transformed_df.shape[0])
    for annotation in source.annotations:
        objective_expressions.append(
            initialize_block(annotation, model, bounded_selection))

    for annotation_pair in list(combinations(source.annotations, 2)):
        generate_block_constraints(annotation_pair[0], annotation_pair[1],
                                   model, False)

    anchors = source.find_anchors(target.transformed_df)
    for anchor in anchors:
        initialize_block(anchor, model, anchor.target_selection)
        for annotation in source.annotations:
            generate_block_constraints(anchor, annotation, model, True)

    model.objective = maximize(sum(objective_expressions))
    status = model.optimize()
    if not (status == OptimizationStatus.OPTIMAL or status == OptimizationStatus.FEASIBLE):
        # To debug infeasible model
        # cf = ConflictFinder(model)
        # iis = cf.find_iis(method=conflict.IISFinderAlgorithm.DELETION_FILTER)
        raise Exception('Non feasible block constraints')

    target_annotations = []
    for annotation in source.annotations:
        x1 = target.get_column_index(int(model.var_by_name(annotation.var_name(X1)).x))
        x2 = target.get_column_index(int(model.var_by_name(annotation.var_name(X2)).x))
        y1 = target.get_row_index(int(model.var_by_name(annotation.var_name(Y1)).x))
        y2 = target.get_row_index(int(model.var_by_name(annotation.var_name(Y2)).x))

        target_annotations.append(annotation.generate_target_annotations(x1, x2, y1, y2))

    return target_annotations
