import React, { Component } from 'react';

import './sheet-selector.css';
import { Button } from 'react-bootstrap';

import { observer } from 'mobx-react';


interface SheetProperties  {

  // csv: null    excel: [ "sheet1", "sheet2", ... ]
  sheetNames?: Array<string>,

  // csv: null    excel: "sheet1"
  currSheetName?: string,

  handleSelectSheet: (event: React.MouseEvent) => void;

  disabled: boolean;
}


@observer
class SheetSelector extends Component<SheetProperties, {}> {

  renderSheets() {
    const {
      currSheetName,
      disabled,
      handleSelectSheet,
      sheetNames,
    } = this.props;
    if ( !sheetNames ) { return undefined; }
    return sheetNames.map((sheet, i) => (
      <Button
        key={i}
        size="sm"
        variant="success"
        disabled={disabled}
        className={sheet === currSheetName ? 'active' : '' }
        onClick={(event: React.MouseEvent) => { handleSelectSheet(event) }}>
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
