import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';

import { observer } from "mobx-react";

interface DownloadProperties {
  showDownload: boolean;
  filename: string;

  handleDoDownload: (fileName: string, fileType: string, downloadAll:boolean) => void;
  cancelDownload: () => void;
}

interface DownloadState {
  downloadFileName: string;
  downloadFileType: string;
  downloadAll: boolean;
}

@observer
class Download extends Component<DownloadProperties, DownloadState> {

  constructor(props: DownloadProperties) {
    super(props);

    this.state = {
      downloadFileName: props.filename,
      downloadFileType: "json",
      downloadAll: false
    };
  }

  download() {
    const { downloadFileName, downloadFileType, downloadAll } = this.state;
    this.props.handleDoDownload(downloadFileName, downloadFileType, downloadAll);
  }

  render() {
    const { downloadAll } = this.state;
    return (
      <Modal show={this.props.showDownload} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Save to file</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="4" md="4" className="pr-0">
                <Form.Label>Format:</Form.Label>
              </Col>
              <Col xs="4" md="4" className="pl-0">
                <Form.Control as="select" onChange={(event) => this.setState({ downloadFileType: event.target.value })}>
                  <option value="json">.json</option>
                  <option value="tsv">kgtk (.tsv)</option>
                  <option value="csv">canonical spreadsheet (.csv)</option>
                </Form.Control>
              </Col>
            </Form.Group>
            <Form.Group as={Row} style={{ marginTop: "1rem" }} className="search-properties"
              onChange={() => { this.setState({ downloadAll: !downloadAll }) }}>
              <Form.Check id="customSwitchesChecked" type="switch" label="Save all the project" defaultChecked={downloadAll} />
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.props.cancelDownload()}>
            Cancel
          </Button>
          <OverlayTrigger placement="bottom" trigger={["hover", "focus"]}
            // defaultShow="true"
            overlay={
              <Tooltip style={{ width: "fit-content" }} id="file">
                <div className="text-left small">
                  Your file will be prepared shortly. Once the file is ready, it will be downloaded automatically.
                </div>
              </Tooltip>
            }
          >
            <Button variant="dark" onClick={() => this.download()}>
              OK
            </Button>
          </OverlayTrigger>

        </Modal.Footer>
      </Modal >
    );
  }
}

export default Download;
