//fills in tabledata and the mouse events, renders a "table" with those properties

import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';

interface TableProps {
    tableData: any;
}

@observer
class WikificationTable extends Component<TableProps, {}> {
    private tableRef = React.createRef<HTMLTableElement>().current!;
    setTableReference(reference?: HTMLTableElement) {
        if ( !reference ) { return; }
        this.tableRef = reference;
    }

    constructor(props: TableProps) {
        super(props);

        // init state
        // this.state = {
        // };
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
                tableData={this.props.tableData}
                onMouseUp={this.handleOnMouseUp.bind(this)}
                onMouseDown={this.handleOnMouseDown.bind(this)}
                onMouseMove={this.handleOnMouseMove.bind(this)}
                onClickHeader={this.handleOnClickHeader.bind(this)}
                setTableReference={this.setTableReference.bind(this)} />
        )
    }
}

export default WikificationTable;
