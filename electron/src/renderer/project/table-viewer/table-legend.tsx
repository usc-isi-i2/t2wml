import React, { Component } from 'react';

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestion } from '@fortawesome/free-solid-svg-icons'

// App
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';

import { observer } from "mobx-react";
import { typeStyles } from '@/renderer/common/utils';

interface LegendProperties {
    multipleSheets: boolean;
}

@observer
class TableLegend extends Component<LegendProperties, {}> {

  renderLegend() {
    return (
      <Popover className="shadow" style={{ backgroundColor: "rgba(255,255,255,0.8)" }} id="table">
        <div style={{ margin: "10px 30px" }}>
          <span><strong>Legend</strong>:&nbsp;</span>
          <span className="legend" style={{ backgroundColor: "white", color: "hsl(200, 100%, 30%)", marginLeft: "0" }}>wikified</span>
          <span className="legend" style={typeStyles.get("subject")}>subject</span>
          <span className="legend" style={typeStyles.get("qualifier")}>qualifier</span>
          <span className="legend" style={typeStyles.get("data")}>data</span>
          <span className="legend" style={typeStyles.get("property")}>property</span>
          <span className="legend" style={typeStyles.get("metadata")}>metadata</span>
          <span className="legend" style={{ backgroundColor: "hsl(0, 0%, 90%)" }}>data&nbsp;(skipped)</span>
        </div>
      </Popover>
    );
  }

  render() {
      return (
          <OverlayTrigger overlay={this.renderLegend()} trigger={["hover", "focus"]} placement="left">
          <Button
            className="myPopover shadow"
            variant="secondary"
            style={this.props.multipleSheets ? { cursor: "default", bottom: "70px" }: { cursor: "default" } }
          >
            <FontAwesomeIcon icon={faQuestion} />
          </Button>
        </OverlayTrigger>
      );
  }
}

export default TableLegend;
