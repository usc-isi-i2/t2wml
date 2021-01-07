
import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';

import { observer } from "mobx-react";
import { currentFilesService } from '../../common/current-file-service';
import wikiStore from '@/renderer/data/store';
import { IReactionDisposer, reaction } from 'mobx';


interface DelinkProperties {
    showCreateYamlModal: boolean;

    handleDoCreateYaml: () => void;
    cancelCreateYaml: () => void;
}

interface DelinkState {
    yamlFileName: string;
    warningMsg: string | undefined;
}

@observer
class CreateYaml extends Component<DelinkProperties, DelinkState> {
  constructor(props: DelinkProperties) {
    super(props);

    this.state = {
      yamlFileName: '',
      warningMsg: undefined,
    };
  }

  private disposers: IReactionDisposer[] = [];

  componentDidMount() {
    this.disposers.push(reaction(() => this.props.showCreateYamlModal, () => this.updateName()));
  }

  componentWillUnmount() {
    for (const disposer of this.disposers) {
      disposer();
    }
  }

  updateName() {
    this.setState({ yamlFileName: '', warningMsg: undefined });

    if (this.props.showCreateYamlModal) {
      const name = this.getDefaultName();
      this.setState({ yamlFileName: name });
    }
  }

  createYaml() {
    // taking the yaml content from wikiStore
    currentFilesService.changeYamlInSameSheet(this.state.yamlFileName);
    this.props.handleDoCreateYaml();
  }

  getDefaultName() {
    let sheetName = currentFilesService.currentState.sheetName;
    if (sheetName) {
      if (sheetName.endsWith('.csv')) {
        sheetName = sheetName.split('.csv')[0];
      }
      let yamlName = sheetName + '.yaml';

      let i = 1;
      while (wikiStore.projects.projectDTO!.yaml_files.includes(yamlName)) {
        yamlName = sheetName + "(" + i + ").yaml";
        i++;
      }

      return yamlName;
    }
    return '';
  }

  updateYamlName(name: string) {
    if (!wikiStore.projects.projectDTO) {
      return;
    }
    this.setState({ warningMsg: undefined });
    if (wikiStore.projects.projectDTO!.yaml_files.indexOf(name) > -1) {
      this.setState({ warningMsg: 'Yaml file with this name already exists, do you want to replace it?' });
    }
    this.setState({ yamlFileName: name });
  }

  render() {
    return (
      <Modal show={this.props.showCreateYamlModal} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>convert to yaml file</Modal.Title>
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
                  defaultValue={this.state.yamlFileName}
                  onChange={(event) => {this.updateYamlName(event.target.value)}}
                />
              </Col>
            </Form.Group>
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Label style={{ color: 'red' }}>
                  {this.state.warningMsg}
                </Form.Label>
              </Col>
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelCreateYaml()}>
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
            <Button variant="dark" onClick={() => this.createYaml()}>
              OK
            </Button>
          </OverlayTrigger>

        </Modal.Footer>
      </Modal >
    );
  }
}

export default CreateYaml;
