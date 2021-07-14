import React, { Component } from 'react';
import { observer } from "mobx-react"
import { OverlayTrigger, Tooltip } from 'react-bootstrap';


@observer
class TableCellItem extends Component<{ rowIndex: number, columnIndex: number, cellData?: any[] }, {}>{


  constructor(props: { rowIndex: number, columnIndex: number, cellData?: any[] }) {
    super(props);
  }

  getClassNames(classNames = '', conditionalClassNames: any = {}) {
    return (
      'cell-div '.concat(`${classNames} `.concat(Object.keys(conditionalClassNames).filter(key => (
        conditionalClassNames[key]
      )).join(' ')))
    );
  }

  render() {
    const { cellData, rowIndex, columnIndex } = this.props;
    if (!cellData) { return }
    
    const data = cellData[1]

    const classNames = this.getClassNames(data.classNames.join(' '), {
      'active': data.active,
      'highlight': data.highlight,
      'maxWidth': data.maxWidth,
      'qnode': !!data.qnode
    });
    
    const cellDisplay = (
      <div data-row-index={rowIndex + 1} data-col-index={columnIndex}>
        {data.content}
        {data.activeTop && <div className="cell-border-top" />}
        {data.activeLeft && <div className="cell-border-left" />}
        {data.activeRight && <div className="cell-border-right" />}
        {data.activeBottom && <div className="cell-border-bottom" />}
        {data.activeCorner && <div className="cell-resize-corner" />}
      </div>
    )

    return (
      <div className={classNames} data-row-index={rowIndex + 1} data-col-index={columnIndex}>
        {
          data.overlay ?
            <OverlayTrigger
              key={`overlay-trigger col-${columnIndex} row-${rowIndex}`}
              placement="right"
              delay={{ show: 50, hide: 200 }}
              overlay={(props) => (
                <Tooltip id="tooltip" {...props} key={`tooltip col-${columnIndex} row-${rowIndex}`}>
                  {data.overlay}
                </Tooltip>
              )}
            >
              {cellDisplay}
            </OverlayTrigger>
            :
            <div className="cell-div" data-row-index={rowIndex + 1} data-col-index={columnIndex}>
              {cellDisplay}
            </div>
        }
      </div>
    );
  }
}

export default TableCellItem;
