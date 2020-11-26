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
  label: 'qnode',
  className: 'type-qnode',
}, {
  label: 'qualifier',
  className: 'type-qualifier',
}, {
  label: 'reference',
  className: 'type-reference',
}, {
  label: 'metadata',
  className: 'type-metadata',
}, {
  label: 'property',
  className: 'type-property',
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
      <Popover className="legend-wrapper shadow">
        <Popover.Title as="h6">Legend</Popover.Title>
        <Popover.Content>
          {this.renderLegend()}
        </Popover.Content>
      </Popover>
    );
  }

  render() {
    const { offset } = this.props;
    return (
      <OverlayTrigger
        placement="top"
        trigger={['hover', 'focus']}
        overlay={this.renderLegendOverlay()}>
        <Button
          variant="secondary"
          className={`legend-button shadow ${!!offset ? 'offset' : ''}`}>
          <FontAwesomeIcon icon={faQuestion} />
        </Button>
      </OverlayTrigger>
    );
  }
}


export default TableLegend;
