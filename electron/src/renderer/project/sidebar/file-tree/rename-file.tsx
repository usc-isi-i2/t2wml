import React, { Component } from 'react';

import * as utils from '../../../common/utils'

import { Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';

interface RenameProperties {
  // pid: number; Is it needed?
  showRenameFile: boolean;
  showSpinner: boolean;
  tempRenameFile: string;
  isTempRenameFileValid: boolean;
  type: string;

  handleRenameFile: (name: string) => void;
  cancelRenameFile: () => void;
}

interface RenameState {
  name: string;
  isNameValid: boolean;
}

class RenameFile extends Component<RenameProperties, RenameState> {
  private input: React.RefObject<HTMLInputElement>;
  constructor(props: RenameProperties) {
    super(props);
    this.input = React.createRef();

    this.state = {
      name: this.props.tempRenameFile,
      isNameValid: this.props.isTempRenameFileValid
    } as RenameState;
  }

  render() {
    return (
      <Modal show={this.props.showRenameFile} onHide={() => { /* do nothing */ }}>

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
                isNameValid: utils.isValidTitle((event.target as HTMLInputElement).value)
              })
            }}>
              <Col sm="12" md="12">
                <Form.Control
                  ref={this.input}
                  type="text"
                  defaultValue={this.props.tempRenameFile}
                  placeholder="Untitled project"
                  autoFocus={true}
                  style={this.state.isNameValid ? {} : { border: "1px solid red" }}
                  onKeyPress={(event: any) => {
                    if (event.key === "Enter") {
                      // if press enter (13), then do create new project
                      event.preventDefault();
                      this.props.handleRenameFile(event.target.value);
                    }
                  }}
                />
                <div className="small" style={this.state.isNameValid ? { display: "none" } : { color: "red" }}>
                  <span>*&nbsp;Cannot contain any of the following characters:&nbsp;</span>
                  <code>&#92;&nbsp;&#58;&nbsp;&#42;&nbsp;&#63;&nbsp;&#34;&nbsp;&#60;&nbsp;&#62;&nbsp;&#124;</code>
                </div>
              </Col>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelRenameFile()} >
            Cancel
          </Button>
          <Button variant="dark" onClick={() => { this.input.current ? this.props.handleRenameFile(this.input.current?.value) : this.props.handleRenameFile('') }} disabled={!(this.state.isNameValid)}>
            Rename
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default RenameFile;
