import React from 'react';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestion } from '@fortawesome/free-solid-svg-icons';

// App
import './table-legend.css';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';

// Gleb: Receive the legend as a property
interface LegendEntry {
  lable: string;
  className: string;
}


const LEGEND = [{
  label: 'wikibase item/property',
  className: 'type-wikibaseitem',
}, {
  label: 'dependent variable',
  className: 'type-data',
}, {
  label: 'subject',
  className: 'type-subject',
}, {
  label: 'qualifier',
  className: 'type-qualifier',
}, {
  label: 'metadata',
  className: 'type-metadata',
}, {
  label: 'property',
  className: 'type-property',
}, {
  label: 'minor error',
  className: 'type-minorError',
}, {
  label: 'major error',
  className: 'type-majorError',
}];


interface LegendProperties {
  offset: boolean;
}


class TableLegend extends React.Component<LegendProperties, {}> {

  renderLegend() {
    return LEGEND.map((item, index) => (
      <span className={item.className} key={index}>
        {item.label}
      </span>
    ))
  }

  renderLegendOverlay() {
    return (
      <Popover id="legend" className="legend-wrapper shadow">
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
          className={`legend-button shadow ${offset ? 'offset' : ''}`}>
          <FontAwesomeIcon icon={faQuestion} />
        </Button>
      </OverlayTrigger>
    );
  }
}


export default TableLegend;
