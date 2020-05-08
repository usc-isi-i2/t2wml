import React, {Component} from 'react';

import * as utils from '../common/utils'

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';

interface RenameProperteis {
  // pid: number; Is it needed?
  showRenameProject: boolean;
  showSpinner: boolean;
  tempRenameProject: string;
  isTempRenameProjectVaild: boolean;

  handleRenameProject :Function;
  cancelRenameProject :Function;
}

interface RenameState {
  name: string;
  isNameVaild: boolean;
}

class RenameProject extends Component<RenameProperteis, RenameState> {
  constructor(props: RenameProperteis) {
    super(props);

    this.state = {
      name: this.props.tempRenameProject,
      isNameVaild: this.props.isTempRenameProjectVaild
    } as RenameState;
  }

  aaa() {
    this.props.handleRenameProject("talya");
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
          <Modal.Title>Rename&nbsp;Project</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            {/* project title */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }} onChange={(event: any) => {
              this.setState({
                name: event.target.value,
                isNameVaild: utils.isValidTitle(event.target.value)
              })
            }}>
              <Col sm="12" md="12">
                <Form.Control
                  type="text"
                  defaultValue={this.props.tempRenameProject}
                  placeholder="Untitled project"
                  autoFocus={true}
                  style={this.state.isNameVaild ? {} : { border: "1px solid red" }}
                  onKeyPress={(event: any) => {
                    if (event.key === "Enter") {
                      // if press enter (13), then do create new project
                      event.preventDefault();
                      this.props.handleRenameProject();
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
          <Button variant="dark" onClick={() => this.props.handleRenameProject(this.state.name)} disabled={!(this.props.isTempRenameProjectVaild)}>
            Rename
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default RenameProject;
