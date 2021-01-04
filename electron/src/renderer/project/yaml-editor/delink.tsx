import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';

import { observer } from "mobx-react";
import { saveFiles } from '../save-files';
import { defaultYamlContent } from '../default-values';
import wikiStore from '@/renderer/data/store';


interface DelinkProperties {
    showDelink: boolean;

    handleDoDelink: (fileName: string) => void;
    cancelDelink: () => void;
}

interface DelinkState {
    delinkFileName: string;
}

@observer
class Delink extends Component<DelinkProperties, DelinkState> {
  constructor(props: DelinkProperties) {
    super(props);

    this.state = {
      delinkFileName: saveFiles.currentState.sheetName + '.yaml' ,
    };
  }

  delink() {
    wikiStore.yaml.yamlContent = defaultYamlContent; //TODO
    saveFiles.currentState.mappingFile = this.state.delinkFileName;
    saveFiles.currentState.mappingType = 'Yaml';

    this.props.handleDoDelink(this.state.delinkFileName);
  }

  getDefaultName() {
    let yamlName = saveFiles.currentState.sheetName;
    if (yamlName) {
      if (yamlName.endsWith('.csv')) {
        yamlName = yamlName.split('.csv')[0];
      } 
      if (!yamlName.endsWith('.yaml')) {
        yamlName += '.yaml';
      }
    }
    return yamlName;
  }

  render() {
    return (
      <Modal show={this.props.showDelink} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Delink - convert to yaml file</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Label>
                  Yaml Name
                </Form.Label>
                <Form.Control
                  type="text"
                  defaultValue={this.getDefaultName()}
                  onChange={(event) => this.setState({ delinkFileName: event.target.value })}
                />
              </Col>
            </Form.Group>
            {/* TODO- show yaml data in the correct format */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Label>Yaml Content</Form.Label>
                <Form.Label>
                  {defaultYamlContent}
                </Form.Label>
              </Col>
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelDelink()}>
            Cancel
          </Button>
          <OverlayTrigger placement="bottom" trigger={["hover", "focus"]}
            overlay={
              <Tooltip style={{ width: "fit-content" }} id="file">
                <div className="text-left small">
                  text here....
                </div>
              </Tooltip>
            }
          >
            <Button variant="dark" onClick={() => this.delink()}>
              OK
            </Button>
          </OverlayTrigger>

        </Modal.Footer>
      </Modal >
    );
  }
}

export default Delink;
