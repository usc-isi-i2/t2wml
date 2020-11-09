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

  renderSheets() {
    const { currSheetName, handleSelectSheet, sheetNames } = this.props;
    if ( !sheetNames ) { return null; }
    return sheetNames.map((sheet, i) => (
      <Button
        key={i}
        size="sm"
        variant="success"
        className={sheet === currSheetName ? 'active' : '' }
        onClick={(event: any) => { handleSelectSheet(event) }}>
        {sheet}
      </Button>
    ));
  }

  render() {
    return (
      <div className="sheetSelector">
        {this.renderSheets()}
      </div>
    )
  }
}


export default SheetSelector;
