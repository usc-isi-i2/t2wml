//fills in tabledata and the mouse events, renders a "table" with those properties

//replace this with table-wrapper and the individual output-table and annotation-table components


import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Table from '../table';

interface TableProps {
    tableData: any;
}

@observer
class OutputTable extends Component<TableProps, {}> {
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

export default OutputTable;
