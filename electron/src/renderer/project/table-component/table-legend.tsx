import React, { Component } from 'react';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';

// App
import './table-legend.css';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';


interface LegendProperties {
  multipleSheets: boolean;
}


const LEGEND = [{
  label: 'data',
  className: 'type-data',
}, {
  label: 'item',
  className: 'type-item',
}, {
  label: 'wikified',
  className: 'type-wikified',
}, {
  label: 'qualifier',
  className: 'type-qualifier',
}, {
  label: 'reference',
  className: 'type-reference',
}, {
  label: 'minorError',
  className: 'type-minorError',
}, {
  label: 'majorError',
  className: 'type-majorError',
}];


class TableLegend extends Component<LegendProperties, {}> {

  renderLegend() {
    return LEGEND.map((item, index) => (
      <span className={item.className} key={index}>
        {item.label}
      </span>
    ))
  }

  renderLegendOverlay() {
    return (
      <Popover className="shadow legend-wrapper">
        <h6>Legend:</h6>
        {this.renderLegend()}
      </Popover>
    );
  }

  render() {
    return (
      <OverlayTrigger
        placement="left"
        trigger={['hover', 'focus']}
        overlay={this.renderLegendOverlay()}>
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
