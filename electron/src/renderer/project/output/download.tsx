import React, { Component } from 'react';

// App
import { Button, Col, Form, Modal, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';

import { observer } from "mobx-react";
import wikiStore from '../../data/store';

interface DownloadProperties {
    showDownload: boolean;

    handleDoDownload: (fileName: string, fileType: string) => void;
    cancelDownload: () => void;
}

interface DownloadState {
  downloadFileName: string;
  downloadFileType: string;
}

@observer
class Download extends Component<DownloadProperties, DownloadState> {
  
  constructor(props: DownloadProperties) {
    super(props);

    this.state = {
      downloadFileName: wikiStore.project.pid,
      downloadFileType: "json",
    };
  }
  
  download() {
      this.props.handleDoDownload(this.state.downloadFileName, this.state.downloadFileType);
      this.setState({
        downloadFileName: wikiStore.project.pid,
        downloadFileType: "json",
      });
    }

  render() {
    return (
      <Modal show={this.props.showDownload} onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Download</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Col xs="9" md="9" className="pr-0">
                <Form.Control
                  type="text"
                  defaultValue={this.state.downloadFileName}
                  onChange={(event) => this.setState({ downloadFileName: event.target.value })}
                />
              </Col>
              <Col xs="3" md="3" className="pl-0">
                <Form.Control as="select" onChange={(event) => this.setState({ downloadFileType: event.target.value })}>
                  <option value="json">.json</option>
                  <option value="tsv">kgtk (.tsv)</option>
                </Form.Control>
              </Col>
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
              Start
            </Button>
          </OverlayTrigger>

        </Modal.Footer>
      </Modal >
    );
  }
}

export default Download;
