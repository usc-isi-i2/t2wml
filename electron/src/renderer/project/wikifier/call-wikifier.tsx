import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

// Table
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

import { observer } from "mobx-react"

interface CallWikifierProperties {
  showCallWikifier: boolean;

  cancelCallWikifier: () => void;
  handleWikifyRegion: (region: string, flag: string, context: string) => void;
}

interface CallWikifierState {
  regionChanged: boolean;
}

@observer
class CallWikifier extends Component<CallWikifierProperties, CallWikifierState> {
  public gridApi: any;
  public gridColumnApi: any;

  private tempWikifyRegionRef: React.RefObject<HTMLInputElement>;
  private tempWikifyFlagRef: React.RefObject<HTMLSelectElement>;
  private tempWikifyContextRef: React.RefObject<HTMLInputElement>;

  constructor(props: CallWikifierProperties) {
    super(props);
    this.tempWikifyRegionRef = React.createRef();
    this.tempWikifyFlagRef = React.createRef();
    this.tempWikifyContextRef = React.createRef();

    // init state
    this.state = {
      regionChanged: false,
    };
  }

  disabledWikify() {
    if (this.state.regionChanged) {
      if (this.tempWikifyRegionRef.current && this.tempWikifyRegionRef.current.value.trim()) {
        return false;
      }
    }
    return true;
  }

  callWikifier() {
    const region = (this.tempWikifyRegionRef as any).current.value.trim();
    const flag = (this.tempWikifyFlagRef as any).current.value;
    const context = (this.tempWikifyContextRef as any).current.value.trim();
    this.props.handleWikifyRegion(region, flag, context);
  }

  render() {
    return (
      <Modal show={this.props.showCallWikifier} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Wikify region</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            {/* region */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                Region
              </Form.Label>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  type="text"
                  ref={this.tempWikifyRegionRef}
                  placeholder="e.g. A1:A10"
                  onChange={() => this.setState({ regionChanged: true })}
                />
              </Col>
            </Form.Group>

            {/* flag */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                Flag
              </Form.Label>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  as="select"
                  ref={this.tempWikifyFlagRef}
                >
                  <option value="0">{"record col & row"}</option>
                  <option value="1">{"record col"}</option>
                  <option value="2">{"record row"}</option>
                  <option value="3">{"don't record"}</option>
                </Form.Control>
              </Col>
            </Form.Group>

            {/* context */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                Context
              </Form.Label>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  type="text"
                  ref={this.tempWikifyContextRef}
                  placeholder="(optional)"
                />
              </Col>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={this.props.cancelCallWikifier}>
            Cancel
          </Button>
          <Button variant="dark"
            onClick={this.callWikifier.bind(this)}
            disabled={this.disabledWikify()}>
            Wikify
          </Button>
        </Modal.Footer>
      </Modal >
    );
  }

}

export default CallWikifier;
