//fills in tabledata and the mouse events, renders a "table" with those properties

import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';

interface TableState {
    tableData: any;
}

@observer
class AnnotationTable extends Component<{}, TableState> {
    private tableRef = React.createRef<HTMLTableElement>().current!;
    setTableReference(reference?: HTMLTableElement) {
        if ( !reference ) { return; }
        this.tableRef = reference;
    }

    constructor(props: {}) {
        super(props);

        // init state
        this.state = {
            tableData: []
        };
    }
 
    handleOnMouseUp() {
        
    }
    
    handleOnMouseDown() {

    }
    
    handleOnMouseMove() {

    }
    
    handleOnClickHeader() {

    }

    render() {
        return (
            <Table
                tableData={this.state.tableData}
                onMouseUp={this.handleOnMouseUp.bind(this)}
                onMouseDown={this.handleOnMouseDown.bind(this)}
                onMouseMove={this.handleOnMouseMove.bind(this)}
                onClickHeader={this.handleOnClickHeader.bind(this)}
                setTableReference={this.setTableReference.bind(this)} />
        )
    }
}

export default AnnotationTable;
