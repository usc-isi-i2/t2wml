
import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';

import { observer } from "mobx-react";
import { remote } from 'electron';
import path from 'path';


interface CreateProperties {
  showCreateProjectModal: boolean;

  createProject: (
    path: string,
    title: string,
    description: string,
    url: string,
  ) => void;
  cancelCreateProject: () => void;
}

interface CreateState {
  path: string;
  title: string;
  description: string;
  url: string;
}

@observer
class CreateProject extends Component<CreateProperties, CreateState> {
  constructor(props: CreateProperties) {
    super(props);

    this.state = {
      path: '',
      title: '',
      description: '',
      url: '',
    };
  }

  createProject() {
    this.props.createProject(this.state.path, this.state.title, this.state.description, this.state.url);
    this.setState({
      path: '',
      title: '',
      description: '',
      url: '',
    });
  }

  async openFile() {
    const result = await remote.dialog.showOpenDialog({
      title: "Open Project Folder",
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths) {
        this.setState({ path: result.filePaths[0], title: path.parse(result.filePaths[0]).name});
    }
  }


  render() {
    return (
      <Modal id="create-project-modal" show={this.props.showCreateProjectModal} onHide={() => { /* do nothing */ }}>
        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>New Project</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <label>Choose a folder for the project. It must not contain an existing project. We recommend an empty folder.</label>
                <Button id="btn-choose-folder-project"  onClick={() => this.openFile()}
                >Choose a folder</Button>
                <Form.Label>{this.state.path}</Form.Label>
              </Col>
            </Form.Group>

            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Label id="label-title">
                  Title
                </Form.Label>
                <Form.Control
                  type="text"
                  defaultValue={this.state.title}
                  onChange={(event) => this.setState({ title: event.target?.value })}
                  id="new-project-control-title"
                />
                {this.state.title ? null : <label style={{ "color": "#FF0000" }}>Title cannot be left blank</label>}
              </Col>
            </Form.Group>

            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Label>
                  Description
                </Form.Label>
                <Form.Control
                  type="text"
                  defaultValue={this.state.description}
                  onChange={(event) => this.setState({ description: event.target?.value })}
                />
              </Col>
            </Form.Group>

            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Label>
                  Data source URL
                </Form.Label>
                <Form.Control
                  type="text"
                  defaultValue={this.state.url}
                  onChange={(event) => this.setState({ url: event.target?.value })}
                />
              </Col>
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelCreateProject()}>
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
            <Button variant="dark" onClick={() => this.createProject()} disabled={!this.state.title || !this.state.path}>
              OK
            </Button>
          </OverlayTrigger>

        </Modal.Footer>
      </Modal >
    );
  }
}

export default CreateProject;
