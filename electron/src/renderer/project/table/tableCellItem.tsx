import React, { Component } from 'react';
import { observer } from "mobx-react"


@observer
class TableCellItem extends Component<{ rowIndex: number, columnIndex: number, cellData?: any }, {}>{


  constructor(props: { rowIndex: number, columnIndex: number, cellData?: any }) {
    super(props);
  }

  render() {
    const {cellData, rowIndex, columnIndex} = this.props;
    // console.log('columnIndex', columnIndex, 'rowIndex', rowIndex, cellData[1])
    const data = cellData[1]
    const classNames = (classNames = '', conditionalClassNames: any = {}) => (
      `${classNames} `.concat(Object.keys(conditionalClassNames).filter(key => (
        conditionalClassNames[key]
      )).join(' '))
    )
    // console.log('data.content', data.content)
    return (
      <div className={classNames(data.classNames.join(' '), {
        'active': data.active,
        'highlight': data.highlight,
        'maxWidth': data.maxWidth,
        'qnode': !!data.qnode,
      })} data-row-index={rowIndex + 1} data-col-index={columnIndex}>
        {data.content}
        {data.activeTop && <div className="cell-border-top" />}
        {data.activeLeft && <div className="cell-border-left" />}
        {data.activeRight && <div className="cell-border-right" />}
        {data.activeBottom && <div className="cell-border-bottom" />}
        {data.activeCorner && <div className="cell-resize-corner" />}
      </div>
    );
  }
}

export default TableCellItem;
