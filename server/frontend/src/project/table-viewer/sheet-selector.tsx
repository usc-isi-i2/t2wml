import React, { Component } from 'react';

// App
import { Button } from 'react-bootstrap';

import { observer } from "mobx-react";


interface SheetProperties  {
    sheetNames: Array<string> | null,     // csv: null    excel: [ "sheet1", "sheet2", ... ]
    currSheetName: string | null,  // csv: null    excel: "sheet1"

    handleSelectSheet: (event: Event) => void;
}


@observer
class SheetSelector extends Component<SheetProperties, {}> {

  render() {
    const { sheetNames, currSheetName } = this.props;

    // if csv file, sheetNames === null && currSheetName === null
    if (sheetNames === null) return null;

    // else, excel file
    const currSheetStyle = { borderColor: "#339966", background: "#339966", padding: "0rem 0.5rem", margin: "0rem 0.25rem" };
    const otherSheetStyle = { borderColor: "#339966", background: "whitesmoke", color: "#339966", padding: "0rem 0.5rem", margin: "0rem 0.25rem" };
    let sheetSelectorHtml = [];
    for (let i = 0, len = sheetNames.length; i < len; i++) {
      sheetSelectorHtml.push(
        <Button
          key={i}
          variant="success"
          size="sm"
          style={sheetNames[i] === currSheetName ? currSheetStyle : otherSheetStyle}
          onClick={(event: any) => { this.props.handleSelectSheet(event) }}
        >{sheetNames[i]}</Button>
      );
    }
    return sheetSelectorHtml;
  }
}

export default SheetSelector;
