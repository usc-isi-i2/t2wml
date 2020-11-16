import React, { Component } from 'react';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';

// App
import './table-legend.css';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';

import { observer } from 'mobx-react';

interface LegendProperties {
  multipleSheets: boolean;
}


const LEGEND = {

}


@observer
class TableLegend extends Component<LegendProperties, {}> {

  renderLegend() {
    return (
      <Popover className="shadow legend-wrapper">
        <h6>Legend:</h6>
        <span style={{ backgroundColor: 'white', color: 'hsl(200, 100%, 30%)', marginLeft: '0' }}>wikified</span>
        <span style={{ backgroundColor: 'hsl(200, 50%, 90%)' }}>item</span>
        <span style={{ backgroundColor: 'hsl(250, 50%, 90%)' }}>qualifier</span>
        <span style={{ backgroundColor: 'hsl(150, 50%, 90%)' }}>data</span>
        <span style={{ backgroundColor: 'hsl(0, 0%, 90%)' }}>data&nbsp;(skipped)</span>
      </Popover>
    );
  }

  render() {
    return (
      <OverlayTrigger
        placement="left"
        trigger={['hover', 'focus']}
        overlay={this.renderLegend()}>
        <Button
          variant="secondary"
          className="legend-button shadow">
          <FontAwesomeIcon icon={faQuestion} />
        </Button>
      </OverlayTrigger>
    );
  }
}


export default TableLegend;
