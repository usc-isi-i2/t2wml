import React, {Component} from 'react';

import { Button, Form, Modal, Row, Spinner } from 'react-bootstrap';


interface LoadProperteis {
  showLoadProject: boolean;
  showSpinner: boolean;

  handleLoadProject: (file: File, path: string) => void;
  cancelLoadProject: () => void;
}

interface LoadState {
  yamlFile: File;
  yamlPath: string;
}


class LoadProject extends Component<LoadProperteis, LoadState> {
  constructor(props: LoadProperteis) {
    super(props);

    this.state = {
        yamlFile: {} as File,
        yamlPath: '',
    } as LoadState;
  }

  render() {
    return (
      <Modal show={this.props.showLoadProject} onHide={() => { /* do nothing */ }}>

        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.props.showSpinner}>
            <Spinner animation="border" />
        </div>
        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Load&nbsp;Project</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row}>
                Enter a yaml file or paste project path
            </Form.Group>

            <Form.Group as={Row} style={{ marginTop: "1rem" }}>  
              <Form.Label>
                Yaml File&nbsp;
              </Form.Label>
              <input
                    type="file"
                    id="yaml_file"
                    accept=".yaml"
                    onChange={(event) => {
                    this.setState({
                        yamlFile: (event.target as any).files[0],
                        // yamlPath: '',
                    });
                }}
              />
            </Form.Group>

            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label>
                  Enter a folder path&nbsp;
              </Form.Label>
              <input type="string"
                onChange={(event) => {
                this.setState({
                    yamlPath: (event.target as any).value,
                    // yamlFile: {} as File,
                });
            }}/>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelLoadProject()} >
            Cancel
          </Button>
          <Button variant="dark" onClick={() => this.props.handleLoadProject(this.state.yamlFile, this.state.yamlPath)} 
            disabled={!this.state.yamlFile.name && this.state.yamlPath === ''}>
            Load
          </Button>
        </Modal.Footer>

      </Modal>
    );
  }
}

export default LoadProject;
