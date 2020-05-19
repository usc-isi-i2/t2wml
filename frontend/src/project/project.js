import React from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import Navbar from '../common/navbar/navbar'


// App
import SplitPane from 'react-split-pane'
import { Button, Col, Dropdown, Form, Modal, Row, Spinner, InputGroup } from 'react-bootstrap';


import { logout } from '../common/session';
import { backendGet, backendPost } from '../common/comm';
import Config from '../common/config';

// console.log
import { LOG } from './classes';

// components
import Editors from './editor';
import Output from './output';
import TableViewer from './table-viewer';

class Project extends React.Component {
  constructor(props) {
    super(props);

    // Get the pid from the URL - the URL is ..../project/<pid>
    // This will be put in an app wide store at some point
    const parts = window.location.href.split('/');
    const pid = parts[parts.length - 1];

    // fetch data from flask
     console.log("<App> opened project: %c" + pid, LOG.highlight);

    // init global variables
    window.pid = pid;
    window.isCellSelectable = false;
    window.sparqlEndpoint = Config.sparql;
    window.onbeforeunload = () => {
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
      tempSparqlEndpoint: window.sparqlEndpoint,

    };
  }

  async componentDidMount() {

    // before sending request
    this.setState({ showSpinner: true });
    // fetch user data from the server
    try {
      const userData = await backendGet('userinfo');
      this.setState( { userData: userData });
    } catch(error) {
      this.handleLogout();
    }

    // fetch project meta
    console.log("<App> -> %c/get_project_meta%c for project list", LOG.link, LOG.default);
    backendPost("/get_project_meta").then(json => {
      console.log("<App> <- %c/get_project_meta%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json !== null) {
          if (json['error'] !== null){
              console.log(json['error'])
          }
          else{
              let projectData = json['projects'];

              // sort
              projectData.sort(function (p1, p2) {
                  if (p1['mdate'] < p2['mdate']) return 1;
                  else if (p1['mdate'] > p2['mdate']) return -1;
                  else return 0;
              });

              // update state
              this.setState({ projectData: projectData });

              // update document title
              let ptitle = null;
              for (let i = 0, len = projectData.length; i < len; i++) {
                  if (projectData[i].pid === window.pid) {
                      ptitle = projectData[i].ptitle;
                      break;
                  }
              }
              if (ptitle !== null) {
                  document.title = ptitle;
              } else {
                  throw Error("No matched pid");
              }
          }


      } else {
        throw Error("No project meta");
      }

      // follow-ups (success)
      this.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);
      alert("Cannot fetch project meta data!\n\n" + error);

      // follow-ups (failure)
      this.setState({ showSpinner: false });
    });

    // before fetching project files
    window.TableViewer.setState({ showSpinner: true });
    window.Wikifier.setState({ showSpinner: true });

    // fetch project files
    console.log("<App> -> %c/get_project_files%c for previous files", LOG.link, LOG.default);
    let formData = new FormData();
    formData.append("pid", window.pid);
    backendPost("/get_project_files", formData).then(json => {
      console.log("<App> <- %c/get_project_files%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { tableData, yamlData, wikifierData, settings } = json;

      // load table data
      if (tableData !== null) {
        window.TableViewer.updateTableData(tableData);
      }

      // load wikifier data
      if (wikifierData !== null) {
        window.TableViewer.updateQnodeCells(wikifierData.qnodes, wikifierData.rowData);
      } else {
        window.TableViewer.updateQnodeCells(); // reset
      }

      // load yaml data
      if (yamlData !== null) {
        window.YamlEditor.updateYamlText(yamlData.yamlFileContent);
        window.TableViewer.updateYamlRegions(yamlData.yamlRegions);
        window.isCellSelectable = true;
        window.Output.setState({ isDownloadDisabled: false });
      } else {
        window.isCellSelectable = false;
      }

      // load settings
      if (settings !== null) {
        window.sparqlEndpoint = settings.endpoint;
      }

      // follow-ups (success)
      window.TableViewer.setState({ showSpinner: false });
      window.Wikifier.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);
      alert("Cannot fetch project files!\n\n" + error);

      // follow-ups (failure)
      window.TableViewer.setState({ showSpinner: false });
      window.Wikifier.setState({ showSpinner: false });
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
    window.sparqlEndpoint = this.refs.tempSparqlEndpoint.value;
    // window.sparqlEndpoint = this.state.tempSparqlEndpoint;
    this.setState({ showSettings: false, tempSparqlEndpoint: window.sparqlEndpoint });

    // notify backend
    console.log("<App> -> %c/update_settings%c", LOG.link, LOG.default);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("endpoint", window.sparqlEndpoint);
    backendPost("/update_settings", formData).catch((error) => {
      console.log(error);
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
                    defaultValue={window.sparqlEndpoint}
                    ref="tempSparqlEndpoint"
                    onKeyDown={(event) => event.stopPropagation()} // or Dropdown would get error
                  />
                  <Dropdown.Toggle split variant="outline-dark" />
                  <Dropdown.Menu style={{ width: "100%" }}>
                    <Dropdown.Item onClick={() => this.refs.tempSparqlEndpoint.value = sparqlEndpoints[0]}>{sparqlEndpoints[0]}</Dropdown.Item>
                    <Dropdown.Item onClick={() => this.refs.tempSparqlEndpoint.value = sparqlEndpoints[1]}>{sparqlEndpoints[1]}</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
            </Form.Group>

          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.setState({ showSettings: false, tempSparqlEndpoint: window.sparqlEndpoint })}>
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
        showSettings="true"
        onShowSettingsClicked={() => this.onShowSettingsClicked()}
        handleLogout={() => this.handleLogout()} />

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
