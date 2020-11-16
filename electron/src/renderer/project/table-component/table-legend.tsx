import React from 'react';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';

// App
import './table-legend.css';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';


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


class TableLegend extends React.Component {

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
        <Popover.Title as="h6">Legend</Popover.Title>
        <Popover.Content>
          {this.renderLegend()}
        </Popover.Content>
      </Popover>
    );
  }

  render() {
    return (
      <OverlayTrigger
        placement="top"
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
