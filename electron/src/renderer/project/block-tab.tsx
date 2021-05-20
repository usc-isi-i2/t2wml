import React, { Component, Fragment } from 'react';
import { observer } from "mobx-react"
import AnnotationForm from './table/annotation-table/annotation-form';
import AnnotationMenu from './table/annotation-table/annotation-menu';

@observer
class BlockTab extends Component {

    constructor(props: {}) {
        super(props);
    }

    render() {
        return (
            <div>
                <AnnotationForm
                    selection={{ x1: 0, x2: 0, y1: 0, y2: 0 }}
                    onSelectionChange={(selection) => { console.log(selection); }}
                    selectedAnnotationBlock={{ selection: { x1: 0, x2: 0, y1: 0, y2: 0 }, role: "dependentVar" }}
                    annotationSuggestions={{ role: "", children: [] }}
                    onChange={() => { return true; }}
                    onChangeSubject={() => { return true; }}
                    onDelete={() => { return true; }}
                    onSubmit={() => { return true; }} />
                {/* Lorem ipsum dolor sit amet consectetur, adipisicing elit. Neque quia corporis consequuntur culpa deserunt iure eius, fuga dignissimos porro, maiores est. Vel voluptas laudantium molestiae blanditiis quod similique. Vero, ad. */}
                {/* <AnnotationMenu
                    key={0}
                    selection={{ x1: 0, x2: 0, y1: 0, y2: 0 }}
                    onSelectionChange={(selection) => { console.log(selection); }}
                    selectedAnnotationBlock={{ selection: { x1: 0, x2: 0, y1: 0, y2: 0 }, role: "dependentVar" }}
                    onDelete={() => { return true; }}
                    annotationSuggestions={{ role: "", children: [] }}
                /> */}

            </div>
        );
    }
}

export default BlockTab;