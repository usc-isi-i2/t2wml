import React, { Component } from 'react';
import { observer } from "mobx-react"
import AnnotationForm from './table/annotation-table/annotation-form';

@observer
class BlockTab extends Component {

    constructor(props: {}) {
        super(props);
    }

    render() {
        return (
            <div>
                <AnnotationForm />
            </div>
        );
    }
}

export default BlockTab;