import React, { Component } from 'react';

import './sheet-selector.css';
import { Button } from 'react-bootstrap';

import { observer } from 'mobx-react';


interface SheetProperties  {

  // csv: null    excel: [ "sheet1", "sheet2", ... ]
  sheetNames: Array<string> | null,

  // csv: null    excel: "sheet1"
  currSheetName: string | null,

  handleSelectSheet: (event: Event) => void;
}


@observer
class SheetSelector extends Component<SheetProperties, {}> {

  render() {
    const { currSheetName, handleSelectSheet, sheetNames} = this.props;

    // CSV files don't have any sheets
    if ( !sheetNames ) { return null; }

    // Excel files have sheets
    const currSheetStyle = {
      borderColor: "#339966",
      background: "#339966",
      padding: "0rem 0.5rem",
      margin: "0rem 0.25rem",
    };

    const otherSheetStyle = {
      borderColor: "#339966",
      background: "whitesmoke",
      color: "#339966",
      padding: "0rem 0.5rem",
      margin: "0rem 0.25rem",
    };

    return sheetNames.map((sheet, i) => (
      <Button
        key={i}
        size="sm"
        variant="success"
        style={sheet === currSheetName ? currSheetStyle : otherSheetStyle}
        onClick={(event: any) => { handleSelectSheet(event) }}>
        {sheet}
      </Button>
    ));
  }
}

export default SheetSelector;
