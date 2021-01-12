import React, { Component } from 'react';

import * as utils from '../common/utils'

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';

interface RenameProperties {
  // pid: number; Is it needed?
  showRenameProject: boolean;
  showSpinner: boolean;
  tempRenameProject: string;
  isTempRenameProjectVaild: boolean;
  type: string;

  handleRenameProject: (name: string) => void;
  cancelRenameProject: () => void;
}

interface RenameState {
  name: string;
  isNameVaild: boolean;
}

class RenameProject extends Component<RenameProperties, RenameState> {
  private input: React.RefObject<HTMLInputElement>;
  constructor(props: RenameProperties) {
    super(props);
    this.input = React.createRef();

    this.state = {
      name: this.props.tempRenameProject,
      isNameVaild: this.props.isTempRenameProjectVaild
    } as RenameState;
  }

  render() {
    return (
      <Modal show={this.props.showRenameProject} onHide={() => { /* do nothing */ }}>

        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.props.showSpinner}>
          <Spinner animation="border" />
        </div>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Rename&nbsp;{this.props.type}</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            {/* project title */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }} onChange={(event: Event) => {
              this.setState({
                name: (event.target as HTMLInputElement).value,
                isNameVaild: utils.isValidTitle((event.target as HTMLInputElement).value)
              })
            }}>
              <Col sm="12" md="12">
                <Form.Control
                  ref={this.input}
                  type="text"
                  defaultValue={this.props.tempRenameProject}
                  placeholder="Untitled project"
                  autoFocus={true}
                  style={this.state.isNameVaild ? {} : { border: "1px solid red" }}
                  onKeyPress={(event: any) => {
                    if (event.key === "Enter") {
                      // if press enter (13), then do create new project
                      event.preventDefault();
                      this.props.handleRenameProject(event.target.value);
                    }
                  }}
                />
                <div className="small" style={this.state.isNameVaild ? { display: "none" } : { color: "red" }}>
                  <span>*&nbsp;Cannot contain any of the following characters:&nbsp;</span>
                  <code>&#92;&nbsp;&#47;&nbsp;&#58;&nbsp;&#42;&nbsp;&#63;&nbsp;&#34;&nbsp;&#60;&nbsp;&#62;&nbsp;&#124;</code>
                </div>
              </Col>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelRenameProject()} >
            Cancel
          </Button>
          <Button variant="dark" onClick={() => { this.input.current ? this.props.handleRenameProject(this.input.current?.value) : this.props.handleRenameProject('') }} disabled={!(this.state.isNameVaild)}>
            Rename
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default RenameProject;
