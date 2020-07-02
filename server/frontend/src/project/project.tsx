import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import Navbar from '../common/navbar/navbar';


// App
import SplitPane from 'react-split-pane'
import { Button, Col, Dropdown, Form, Modal, Row, Spinner, InputGroup } from 'react-bootstrap';


import { logout } from '../common/session';
import Config from '../common/config';

// console.log
import { LOG, ErrorMessage } from '../common/general';

// components
import Editors from './editor';
import Output from './output';
import TableViewer from './table-viewer';
import RequestService from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../data/store';

interface ProjectProperties {

}

interface ProjectState {
  showSettings: boolean;
  showSpinner: boolean;
  projectData:  any; //todo: add project class[]
  userData: any; //todo: add user class{ },
  tempSparqlEndpoint: string;
  errorMessage: ErrorMessage;
}

@observer
class Project extends Component<ProjectProperties, ProjectState> {
  private tempSparqlEndpointRef: React.RefObject<HTMLInputElement>;
  private requestService: RequestService;
  private pid: string;

  constructor(props: ProjectProperties) {
    super(props);
    this.requestService = new RequestService();
    this.tempSparqlEndpointRef = React.createRef();

    // Get the pid from the URL - the URL is ..../project/<pid>
    // This will be put in an app wide store at some point
    
    // this.pid = wikiStore.project.pid; //?
    // if (this.pid === "") {
    //     const parts = window.location.href.split('/');
    //     this.pid = parts[parts.length - 1];
    //     wikiStore.project.pid = this.pid
    // }

    const parts = window.location.href.split('/');
    this.pid = parts[parts.length - 1];
    wikiStore.project.pid = this.pid;

    // fetch data from flask
     console.log("<App> opened project: %c" + this.pid, LOG.highlight);

    // init global variables
    wikiStore.table.isCellSelectable = false;
    wikiStore.settings.sparqlEndpoint = Config.sparql;
    (window as any).onbeforeunload = () => {
      return null; // only "null" cannot prevent leave/reload page
    };

    // init state
    this.state = {

      // appearance
      showSettings: false,
      showSpinner: false,

      // project list
      projectData: [],
      // projectData: [
      //   { pid: "4444", ptitle: "Project 4", cdate: 1566282771986, mdate: 1566282771986 },
      //   { pid: "1111", ptitle: "Project 1", cdate: 1565807259582, mdate: 1565807259582 },
      //   { pid: "2222", ptitle: "Project 2", cdate: 1565720859582, mdate: 1565720859582 },
      //   { pid: "3333", ptitle: "Project 3", cdate: 1563906459582, mdate: 1563906459582 },
      // ],

      // user
      userData: { },

      // settings
      tempSparqlEndpoint: wikiStore.settings.sparqlEndpoint,

      errorMessage: {} as ErrorMessage,
    };
  }

  async componentDidMount() {

    // before fetching project files
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // fetch project files
    console.log("<App> -> %c/get_project_files%c for previous files", LOG.link, LOG.default);
    this.requestService.getProjectFiles(this.pid).then(json => {
      console.log("<App> <- %c/get_project_files%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { tableData, yamlData, wikifierData, settings, title } = json;
      document.title = title;

      // load table data
      if (tableData !== null) {
          wikiStore.table.updateTableData(tableData);
      }

      // load wikifier data
      if (wikifierData !== null) {
          wikiStore.table.updateQnodeCells(wikifierData.qnodes, wikifierData.rowData);
      } else {
          wikiStore.table.updateQnodeCells(); // reset
      }

      // load yaml data
      if (yamlData !== null) {
        wikiStore.yaml.updateYamlText(yamlData.yamlFileContent);
        wikiStore.table.updateYamlRegions(yamlData.yamlRegions);
        wikiStore.table.isCellSelectable = true;
        wikiStore.output.isDownloadDisabled = false;
      } else {
        wikiStore.table.isCellSelectable = false;
      }

      // load settings
      if (settings !== null) {
        wikiStore.settings.sparqlEndpoint = settings.endpoint;
      }

      // follow-ups (success)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;

    }).catch((error: ErrorMessage) => {
      console.log(error);
      error.errorDescription += "\n\nCannot fetch project!";
      this.setState({ errorMessage: error });
//    alert("Cannot fetch project files!\n\n" + error);

      // follow-ups (failure)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    });
  }

  handleLogout() {
    logout();
  }

  onShowSettingsClicked() {
    this.setState({ showSettings: true });
  }

  handleSaveSettings() {
    console.log("<App> updated settings");

    // update settings
    wikiStore.settings.sparqlEndpoint = (this.tempSparqlEndpointRef as any).current.value;
    // window.sparqlEndpoint = this.state.tempSparqlEndpoint;
    this.setState({ showSettings: false, tempSparqlEndpoint: wikiStore.settings.sparqlEndpoint });

    // notify backend
    console.log("<App> -> %c/update_settings%c", LOG.link, LOG.default);
    let formData = new FormData();
    formData.append("endpoint", wikiStore.settings.sparqlEndpoint);
    this.requestService.updateSettings(this.pid, formData).catch((error: ErrorMessage) => {
      console.log(error);
      error.errorDescription += "\n\nCannot update settings!";
      this.setState({ errorMessage: error });
    });
  }

  renderSettings() {
    const { showSettings } = this.state;
    const sparqlEndpoints = [
      Config.sparql,
      "https://query.wikidata.org/sparql"
    ];
    return (
      <Modal show={showSettings} size="lg" onHide={() => { /* do nothing */ }}>

        {/* header */}
        <Modal.Header style={{ background: "whitesmoke" }}>
          <Modal.Title>Settings</Modal.Title>
        </Modal.Header>

        {/* body */}
        <Modal.Body>
          <Form className="container">

            {/* project id */}
            {/* <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                Project&nbsp;ID
              </Form.Label>
              <Col sm="12" md="9">
                <Form.Control type="text" defaultValue={window.pid} readOnly />
              </Col>
            </Form.Group> */}

            {/* sparql endpoint */}
            <Form.Group as={Row} style={{ marginTop: "1rem" }}>
              <Form.Label column sm="12" md="3" className="text-right">
                SPARQL&nbsp;endpoint
              </Form.Label>
              <Col sm="12" md="9">
                <Dropdown as={InputGroup} alignRight>
                  <Form.Control
                    type="text"
                    defaultValue={wikiStore.settings.sparqlEndpoint}
                    ref={this.tempSparqlEndpointRef}
                    onKeyDown={(event: any) => event.stopPropagation()} // or Dropdown would get error
                  />
                  <Dropdown.Toggle split variant="outline-dark" id="endpoint"/>
                  <Dropdown.Menu style={{ width: "100%" }}>
                    <Dropdown.Item onClick={() => (this.tempSparqlEndpointRef as any).current.value = sparqlEndpoints[0]}>{sparqlEndpoints[0]}</Dropdown.Item>
                    <Dropdown.Item onClick={() => (this.tempSparqlEndpointRef as any).current.value = sparqlEndpoints[1]}>{sparqlEndpoints[1]}</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.setState({ showSettings: false, tempSparqlEndpoint: wikiStore.settings.sparqlEndpoint })}>
            Cancel
          </Button>
          <Button variant="dark" onClick={() => this.handleSaveSettings()}>
            Save
          </Button>
        </Modal.Footer>

      </Modal >
    );
  }

  render() {
    const { showSpinner, userData } = this.state;
    return (
      <div>
        <Navbar userData={userData}
        showSettings={true}
        onShowSettingsClicked={() => this.onShowSettingsClicked()}
        handleLogout={() => this.handleLogout()} />

        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }

        {/* loading spinner */}
        <div className="mySpinner" hidden={!showSpinner} style={{ height: "100%" }}>
          <Spinner animation="border" />
        </div>

        {/* modal */}
        {this.renderSettings()}



        {/* content */}
        <div>
          <SplitPane className="p-3" split="vertical" defaultSize="55%" minSize={300} maxSize={-300} style={{ height: "calc(100vh - 50px)", background: "#f8f9fa" }}>
            <TableViewer />
            <SplitPane className="" split="horizontal" defaultSize="60%" minSize={200} maxSize={-200}>
              <Editors />
              <Output />
            </SplitPane>
          </SplitPane>
        </div>

      </div>
    );
  }
}

export default Project;
