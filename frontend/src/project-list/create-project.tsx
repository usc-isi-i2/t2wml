import React, {Component} from 'react';

import { Button, Col, Form, Modal, Row , Spinner} from 'react-bootstrap';

import * as utils from '../common/utils';


interface CreateProperteis {
  showCreateProject: boolean;
  showSpinner: boolean;
  // tempCreateProject: string;
  // isTempCreateProjectVaild: boolean;

  handleCreateProject: (name: string) => void;
  cancelCreateProject: () => void;
}

interface CreateState {
  tempCreateProject: string;
  isTempCreateProjectVaild: boolean;
}


class CreateProject extends Component<CreateProperteis, CreateState> {
  constructor(props: CreateProperteis) {
    super(props);

    this.state = {
      tempCreateProject: 'Untitled Project',
      isTempCreateProjectVaild: true
    } as CreateState;
  }

  render() {
    return (
      <Modal show={this.props.showCreateProject} onHide={() => { /* do nothing */ }}>

        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.props.showSpinner}>
          <Spinner animation="border" />
        </div>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>New&nbsp;Project</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            {/* project title */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }} onChange={(event: Event) => {
              this.setState({
                tempCreateProject: (event.target as HTMLInputElement).value,
                isTempCreateProjectVaild: utils.isValidTitle((event.target as HTMLInputElement).value)
              })
            }}>
              {/* <Form.Label column sm="12" md="2" className="text-right">
                Title
              </Form.Label> */}
              <Col sm="12" md="12">
                <Form.Control
                  type="text"
                  defaultValue=""
                  placeholder={this.state.tempCreateProject}
                  autoFocus={true}
                  style={this.state.isTempCreateProjectVaild ? {} : { border: "1px solid red" }}
                  onKeyPress={(event: any) => {
                    // todo: add type event
                    if (event.key === "Enter") {
                      // if press enter (13), then do create new project
                      event.preventDefault();
                      this.props.handleCreateProject(this.state.tempCreateProject);
                    }
                  }}
                />
                <div className="small" style={this.state.isTempCreateProjectVaild ? { display: "none" } : { color: "red" }}>
                  <span>*&nbsp;Cannot contain any of the following characters:&nbsp;</span>
                  <code>&#92;&nbsp;&#47;&nbsp;&#58;&nbsp;&#42;&nbsp;&#63;&nbsp;&#34;&nbsp;&#60;&nbsp;&#62;&nbsp;&#124;</code>
                </div>
              </Col>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelCreateProject()} >
            Cancel
          </Button>
          <Button variant="dark" onClick={() => this.props.handleCreateProject(this.state.tempCreateProject)} disabled={!(this.state.isTempCreateProjectVaild)}>
            Create
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default CreateProject;
