import React from 'react';
import './App.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import { DEFAULT_BACKEND_SERVER, DEFAULT_SPARQL_ENDPOINT } from '../config.js';
import * as utils from '../utils'
import T2WMLLogo from '../index/T2WMLLogo'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestion, faUser } from '@fortawesome/free-solid-svg-icons'

// App
import SplitPane from 'react-split-pane'
import { Button, ButtonGroup, Card, Col, Dropdown, Form, Image, Modal, Nav, Navbar, NavDropdown, OverlayTrigger, Popover, Row, Spinner, Toast, Tooltip, InputGroup } from 'react-bootstrap';

// Table
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

// YAML
import MonacoEditor from 'react-monaco-editor';
import yaml from 'js-yaml';

// Output
import Downloader from 'js-file-download'

// console.log
const LOG = {
  default: "background: ; color: ",
  highlight: "background: yellow; color: black",
  link: "background: white; color: blue"
};

// http://patorjk.com/software/taag/#p=display&f=Doh&t=App
//                AAA                                                      
//               A:::A                                                     
//              A:::::A                                                    
//             A:::::::A                                                   
//            A:::::::::A          ppppp   ppppppppp   ppppp   ppppppppp   
//           A:::::A:::::A         p::::ppp:::::::::p  p::::ppp:::::::::p  
//          A:::::A A:::::A        p:::::::::::::::::p p:::::::::::::::::p 
//         A:::::A   A:::::A       pp::::::ppppp::::::ppp::::::ppppp::::::p
//        A:::::A     A:::::A       p:::::p     p:::::p p:::::p     p:::::p
//       A:::::AAAAAAAAA:::::A      p:::::p     p:::::p p:::::p     p:::::p
//      A:::::::::::::::::::::A     p:::::p     p:::::p p:::::p     p:::::p
//     A:::::AAAAAAAAAAAAA:::::A    p:::::p    p::::::p p:::::p    p::::::p
//    A:::::A             A:::::A   p:::::ppppp:::::::p p:::::ppppp:::::::p
//   A:::::A               A:::::A  p::::::::::::::::p  p::::::::::::::::p 
//  A:::::A                 A:::::A p::::::::::::::pp   p::::::::::::::pp  
// AAAAAAA                   AAAAAAAp::::::pppppppp     p::::::pppppppp    
//                                  p:::::p             p:::::p            
//                                  p:::::p             p:::::p            
//                                 p:::::::p           p:::::::p           
//                                 p:::::::p           p:::::::p           
//                                 p:::::::p           p:::::::p           
//                                 ppppppppp           ppppppppp      

class App extends React.Component {
  constructor(props) {
    super(props);

    // fetch data from flask
    const { pid, userData } = this.props;
    console.log("<App> opened project: %c" + pid, LOG.highlight);

    // init global variables
    window.pid = pid;
    window.server = DEFAULT_BACKEND_SERVER;
    window.sparqlEndpoint = DEFAULT_SPARQL_ENDPOINT;
    window.isCellSelectable = false;
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
      userData: userData,

      // settings
      tempSparqlEndpoint: window.sparqlEndpoint,

    };
  }

  componentDidMount() {

    // before sending request
    this.setState({ showSpinner: true });

    // fetch project meta
    console.log("<App> -> %c/get_project_meta%c for project list", LOG.link, LOG.default);
    fetch(window.server + "/get_project_meta", {
      mode: "cors",
      method: "POST"
    }).then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then(response => {
      return response.json();
    }).then(json => {
      console.log("<App> <- %c/get_project_meta%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json !== null) {
        let projectData = json;

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
    fetch(window.server + "/get_project_files", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then(response => {
      return response.json();
    }).then(json => {
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
        window.TableViewer.updateQnodeCells(wikifierData.qnodes, wikifierData.regions);
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
    window.location.href = window.server + "/logout";
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
    fetch(window.server + "/update_settings", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).catch((error) => {
      console.log(error);
    });
  }

  renderSettings() {
    const { showSettings } = this.state;
    const sparqlEndpoints = [
      DEFAULT_SPARQL_ENDPOINT,
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

        {/* loading spinner */}
        <div className="mySpinner" hidden={!showSpinner} style={{ height: "100%" }}>
          <Spinner animation="border" />
        </div>

        {/* modal */}
        {this.renderSettings()}

        {/* navbar */}
        <Navbar className="shadow" bg="dark" sticky="top" variant="dark" style={{ height: "50px" }}>

          {/* logo */}
          <T2WMLLogo />

          {/* avatar */}
          <Nav className="ml-auto">
            <NavDropdown alignRight title={<Image src={userData.picture} style={{ width: "30px", height: "30px" }} rounded />}>

              {/* user info */}
              <NavDropdown.Item style={{ color: "gray" }} disabled>
                <div style={{ fontWeight: "bold" }}>
                  <FontAwesomeIcon icon={faUser} />&nbsp;{userData.name}
                </div>
                <div>
                  {userData.email}
                </div>
              </NavDropdown.Item>

              {/* settings */}
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={() => this.setState({ showSettings: true })}>
                Settings
              </NavDropdown.Item>

              {/* log out */}
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={() => this.handleLogout()} style={{ color: "hsl(0, 100%, 30%)" }}>
                Log out
              </NavDropdown.Item>

            </NavDropdown>
          </Nav>

        </Navbar>

        {/* content */}
        <div>
          <SplitPane className="p-3" split="vertical" defaultSize="60%" minSize={300} maxSize={-300} style={{ height: "calc(100vh - 50px)", background: "#f8f9fa" }}>
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

//                                       bbbbbbbb                                        
// TTTTTTTTTTTTTTTTTTTTTTT               b::::::b            lllllll                     
// T:::::::::::::::::::::T               b::::::b            l:::::l                     
// T:::::::::::::::::::::T               b::::::b            l:::::l                     
// T:::::TT:::::::TT:::::T                b:::::b            l:::::l                     
// TTTTTT  T:::::T  TTTTTTaaaaaaaaaaaaa   b:::::bbbbbbbbb     l::::l     eeeeeeeeeeee    
//         T:::::T        a::::::::::::a  b::::::::::::::bb   l::::l   ee::::::::::::ee  
//         T:::::T        aaaaaaaaa:::::a b::::::::::::::::b  l::::l  e::::::eeeee:::::ee
//         T:::::T                 a::::a b:::::bbbbb:::::::b l::::l e::::::e     e:::::e
//         T:::::T          aaaaaaa:::::a b:::::b    b::::::b l::::l e:::::::eeeee::::::e
//         T:::::T        aa::::::::::::a b:::::b     b:::::b l::::l e:::::::::::::::::e 
//         T:::::T       a::::aaaa::::::a b:::::b     b:::::b l::::l e::::::eeeeeeeeeee  
//         T:::::T      a::::a    a:::::a b:::::b     b:::::b l::::l e:::::::e           
//       TT:::::::TT    a::::a    a:::::a b:::::bbbbbb::::::bl::::::le::::::::e          
//       T:::::::::T    a:::::aaaa::::::a b::::::::::::::::b l::::::l e::::::::eeeeeeee  
//       T:::::::::T     a::::::::::aa:::ab:::::::::::::::b  l::::::l  ee:::::::::::::e  
//       TTTTTTTTTTT      aaaaaaaaaa  aaaabbbbbbbbbbbbbbbb   llllllll    eeeeeeeeeeeeee  

// class Cell extends React.Component {
//   render() {
//     const value = String(this.props.value);

//     // blank cell
//     if (value === undefined || value === null || value === "") return;

//     // hyperlink in format [text](href), e.g. [Burundi](https://www.wikidata.org/wiki/Q967)
//     if (/^\[.+\]\(.+\)$/.test(value)) {
//       const text = value.match(/(?<=\[).+(?=\])/)[0];
//       const href = value.match(/(?<=\().+(?=\))/)[0];
//       return (
//         <a
//           title={text}
//           href={href}
//           target="_blank"
//           rel="noopener noreferrer"
//           style={{ "color": "hsl(200, 100%, 30%)", "textDecoration": "underline" }}
//         >
//           {text}
//         </a>
//       );
//     }

//     // others
//     return (
//       <span title={value}>
//         {value}
//       </span>
//     );
//   }
// }

class TableViewer extends React.Component {
  constructor(props) {
    super(props);

    // init global variables
    window.TableViewer = this;

    // init state
    this.state = {

      // appearance
      showSpinner: false,
      showToast0: false,  // showing details of current cell
      showToast1: false,  // showing temperary messages
      msgInToast1: "Hi",  // message shows in toast 1

      // table data
      filename: null,       // if null, show "Table Viewer"
      isCSV: true,         // csv: true   excel: false
      sheetNames: null,     // csv: null    excel: [ "sheet1", "sheet2", ... ]
      currSheetName: null,  // csv: null    excel: "sheet1"
      columnDefs: [{ "headerName": "", "field": "^", "pinned": "left", "width": 40 }, { "headerName": "A", "field": "A" }, { "headerName": "B", "field": "B" }, { "headerName": "C", "field": "C" }, { "headerName": "D", "field": "D" }, { "headerName": "E", "field": "E" }, { "headerName": "F", "field": "F" }, { "headerName": "G", "field": "G" }, { "headerName": "H", "field": "H" }, { "headerName": "I", "field": "I" }, { "headerName": "J", "field": "J" }, { "headerName": "K", "field": "K" }, { "headerName": "L", "field": "L" }, { "headerName": "M", "field": "M" }, { "headerName": "N", "field": "N" }, { "headerName": "O", "field": "O" }, { "headerName": "P", "field": "P" }, { "headerName": "Q", "field": "Q" }, { "headerName": "R", "field": "R" }, { "headerName": "S", "field": "S" }, { "headerName": "T", "field": "T" }, { "headerName": "U", "field": "U" }, { "headerName": "V", "field": "V" }, { "headerName": "W", "field": "W" }, { "headerName": "X", "field": "X" }, { "headerName": "Y", "field": "Y" }, { "headerName": "Z", "field": "Z" }, { "headerName": "AA", "field": "AA" }, { "headerName": "AB", "field": "AB" }, { "headerName": "AC", "field": "AC" }, { "headerName": "AD", "field": "AD" }, { "headerName": "AE", "field": "AE" }, { "headerName": "AF", "field": "AF" }, { "headerName": "AG", "field": "AG" }, { "headerName": "AH", "field": "AH" }, { "headerName": "AI", "field": "AI" }, { "headerName": "AJ", "field": "AJ" }, { "headerName": "AK", "field": "AK" }, { "headerName": "AL", "field": "AL" }, { "headerName": "AM", "field": "AM" }, { "headerName": "AN", "field": "AN" }, { "headerName": "AO", "field": "AO" }, { "headerName": "AP", "field": "AP" }, { "headerName": "AQ", "field": "AQ" }, { "headerName": "AR", "field": "AR" }, { "headerName": "AS", "field": "AS" }, { "headerName": "AT", "field": "AT" }, { "headerName": "AU", "field": "AU" }, { "headerName": "AV", "field": "AV" }, { "headerName": "AW", "field": "AW" }, { "headerName": "AX", "field": "AX" }, { "headerName": "AY", "field": "AY" }, { "headerName": "AZ", "field": "AZ" }],
      rowData: [{ "^": "1", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "2", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "3", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "4", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "5", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "6", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "7", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "8", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "9", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "10", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "11", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "12", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "13", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "14", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "15", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "16", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "17", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "18", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "19", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "20", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "21", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "22", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "23", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "24", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "25", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "26", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "27", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "28", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "29", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "30", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "31", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "32", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "33", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "34", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "35", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "36", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "37", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "38", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "39", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "40", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "41", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "42", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "43", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "44", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "45", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "46", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "47", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "48", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "49", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "50", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "51", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "52", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "53", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "54", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "55", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "56", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "57", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "58", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "59", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "60", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "61", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "62", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "63", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "64", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "65", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "66", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "67", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "68", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "69", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "70", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "71", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "72", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "73", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "74", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "75", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "76", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "77", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "78", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "79", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "80", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "81", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "82", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "83", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "84", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "85", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "86", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "87", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "88", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "89", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "90", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "91", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "92", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "93", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "94", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "95", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "96", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "97", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "98", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "99", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }, { "^": "100", "A": "", "B": "", "C": "", "D": "", "E": "", "F": "", "G": "", "H": "", "I": "", "J": "", "K": "", "L": "", "M": "", "N": "", "O": "", "P": "", "Q": "", "R": "", "S": "", "T": "", "U": "", "V": "", "W": "", "X": "", "Y": "", "Z": "", "AA": "", "AB": "", "AC": "", "AD": "", "AE": "", "AF": "", "AG": "", "AH": "", "AI": "", "AJ": "", "AK": "", "AL": "", "AM": "", "AN": "", "AO": "", "AP": "", "AQ": "", "AR": "", "AS": "", "AT": "", "AU": "", "AV": "", "AW": "", "AX": "", "AY": "", "AZ": "" }],

      // temp
      selectedCell: { "col": null, "row": null, "value": null },
      yamlRegions: null,

    };

    // init functions
    this.handleOpenTableFile = this.handleOpenTableFile.bind(this);
    this.handleOpenWikifierFile = this.handleOpenWikifierFile.bind(this);
    this.handleSelectCell = this.handleSelectCell.bind(this);
    this.handleSelectSheet = this.handleSelectSheet.bind(this);
  }

  onGridReady(params) {
    // store the api
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    // console.log("<TableViewer> inited ag-grid and retrieved its API");
  }

  handleOpenTableFile(event) {
    // remove current status
    window.isCellSelectable = false;
    this.updateSelectedCell();
    this.updateQnodeCells();

    // get table file
    const file = event.target.files[0];
    if (!file) return;

    // before sending request
    this.setState({ showSpinner: true });
    window.Wikifier.setState({ showSpinner: true });

    // send request
    console.log("<TableViewer> -> %c/upload_data_file%c for table file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("file", file);
    fetch(window.server + "/upload_data_file", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<TableViewer> <- %c/upload_data_file%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      let { tableData, wikifierData, yamlData } = json;

      // load table data
      tableData.sheetData.columnDefs[0].pinned = "left"; // set first col pinned at left
      tableData.sheetData.columnDefs[0].width = 40; // set first col 40px width (max 5 digits, e.g. "12345")
      this.setState({
        filename: tableData.filename,
        isCSV: tableData.isCSV,
        sheetNames: tableData.sheetNames,
        currSheetName: tableData.currSheetName,
        columnDefs: tableData.sheetData.columnDefs,
        rowData: tableData.sheetData.rowData,
      });
      // this.gridColumnApi.autoSizeAllColumns();

      // load wikifier data
      if (wikifierData !== null) {
        this.updateQnodeCells(wikifierData.qnodes, wikifierData.regions);
      } else {
        this.updateQnodeCells(); // reset
      }

      // load yaml data
      if (yamlData !== null) {
        window.YamlEditor.updateYamlText(yamlData.yamlFileContent);
        this.updateYamlRegions(yamlData.yamlRegions);
        window.isCellSelectable = true;
      } else {
        window.isCellSelectable = false;
      }


      // follow-ups (success)
      this.setState({ showSpinner: false });
      window.Wikifier.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      this.setState({ showSpinner: false });
      window.Wikifier.setState({ showSpinner: false });
    });
  }

  handleOpenWikifierFile(event) {
    // remove current status
    this.updateQnodeCells();

    // get wikifier file
    const file = event.target.files[0];
    if (!file) return;

    // before sending request
    this.setState({ showSpinner: true });
    window.Wikifier.setState({ showSpinner: true });

    // send request
    console.log("<TableViewer> -> %c/upload_wikifier_output%c for wikifier file: %c" + file.name, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("wikifier_output", file);
    fetch(window.server + "/upload_wikifier_output", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<TableViewer> <- %c/upload_wikifier_output%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { qnodes, regions } = json;
      this.updateQnodeCells(qnodes, regions);

      // follow-ups (success)
      this.setState({
        showSpinner: false,
        msgInToast1: "✅ Wikifier file loaded",
        showToast1: true,
      });
      window.Wikifier.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      this.updateQnodeCells();
      this.setState({ showSpinner: false });
      window.Wikifier.setState({ showSpinner: false });
    });
  }

  handleSelectCell(params) {
    // remove current status
    this.updateSelectedCell();
    window.Output.removeOutput();

    // get selected cell index
    const colName = String(params.colDef["headerName"]);
    const rowName = String(params.rowIndex + 1);
    const value = String(params.value);

    // check if row header
    if (colName === "") {
      console.log("<TableViewer> clicked row: %c[" + rowName + "]", LOG.highlight);
      return;
    }

    // else, normal cell
    this.updateSelectedCell(colName, rowName, value);

    // before sending request
    if (!window.isCellSelectable) return;
    this.setState({ showSpinner: true });
    window.Output.setState({ showSpinner: true });

    // send request
    console.log("<TableViewer> -> %c/resolve_cell%c for cell: %c" + colName + rowName + "%c " + value, LOG.link, LOG.default, LOG.highlight, LOG.default);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("col", colName);
    formData.append("row", rowName);
    fetch(window.server + "/resolve_cell", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<TableViewer> <- %c/resolve_cell%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      window.Output.updateOutput(colName, rowName, json);

      // follow-ups (success)
      this.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      window.Output.setState({ showSpinner: false });
      this.setState({ showSpinner: false });
    });
  }

  handleSelectSheet(event) {
    // remove current status
    this.updateSelectedCell();
    window.YamlEditor.updateYamlText();
    this.updateYamlRegions();
    this.updateQnodeCells();
    window.Output.removeOutput();
    window.Output.setState({ isDownloadDisabled: true });

    // before sending request
    this.setState({ showSpinner: true });
    window.Wikifier.setState({ showSpinner: true });

    // send request
    const sheetName = event.target.innerHTML;
    console.log("<TableViewer> -> %c/change_sheet%c for sheet: %c" + sheetName, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("sheet_name", sheetName);
    fetch(window.server + "/change_sheet", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<TableViewer> <- %c/change_sheet%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      let { tableData, wikifierData, yamlData } = json;

      // load table data
      tableData.sheetData.columnDefs[0].pinned = "left"; // set first col pinned at left
      tableData.sheetData.columnDefs[0].width = 40; // set first col 40px width (max 5 digits, e.g. "12345")
      this.setState({
        filename: tableData.filename,
        isCSV: tableData.isCSV,
        // sheetNames: tableData.sheetNames, // backend would not send this
        currSheetName: tableData.currSheetName,
        columnDefs: tableData.sheetData.columnDefs,
        rowData: tableData.sheetData.rowData,
      });
      // this.gridColumnApi.autoSizeAllColumns();

      // load wikifier data
      if (wikifierData !== null) {
        this.updateQnodeCells(wikifierData.qnodes, wikifierData.regions);
      } else {
        this.updateQnodeCells(); // reset
      }

      // load yaml data
      if (yamlData !== null) {
        window.YamlEditor.updateYamlText(yamlData.yamlFileContent);
        this.updateYamlRegions(yamlData.yamlRegions);
        window.isCellSelectable = true;
        window.Output.setState({ isDownloadDisabled: false });
      } else {
        window.isCellSelectable = false;
      }

      // follow-ups (success)
      this.setState({ showSpinner: false });
      window.Wikifier.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      this.setState({ showSpinner: false });
      window.Wikifier.setState({ showSpinner: false });
    });
  }

  updateQnodeCells(qnodeData = null, regionData = null) {
    if (qnodeData === null) {
      // reset qnode cells
      const qnodes = Object.keys(window.Wikifier.state.qnodeData);
      if (qnodes.length === 0) return;
      const cells = { qnode: qnodes };
      const presets = {
        qnode: { color: "" }
      };
      this.updateStyleByDict(cells, presets);

      // reset wikifier data
      window.Wikifier.updateWikifier();

    } else {
      // update qnode cells
      const qnodes = Object.keys(Object.fromEntries(Object.entries(qnodeData).filter(([k, v]) => v !== "")));
      const cells = { qnode: qnodes };
      const presets = {
        qnode: { color: "hsl(200, 100%, 30%)" }
      };
      this.updateStyleByDict(cells, presets);

      // update wikifier data
      window.Wikifier.updateWikifier(qnodeData, regionData);
    }
  }

  updateSelectedCell(col = null, row = null, value = null) {
    if (col === null) {
      // reset
      const { selectedCell } = this.state;
      if (selectedCell !== null) {
        this.updateStyleByCell(selectedCell.col, selectedCell.row, { border: "" });
      }
      this.setState({
        selectedCell: null,
        showToast0: false
      });
    } else {
      // update
      this.updateStyleByCell(col, row, { border: "1px solid hsl(150, 50%, 40%) !important" });
      this.setState({
        selectedCell: { col: col, row: row, value: value },
        showToast0: true,
      });
    }

  }

  updateStyleByCell(colName, rowName, style, override = false) {
    const col = colName;
    const row = rowName - 1;
    let rowData2 = this.state.rowData;
    if (rowData2 !== undefined && rowData2[row] !== undefined) {
      if (rowData2[row]["styles"] === undefined) {
        rowData2[row]["styles"] = {};
      }
      if (override) {
        rowData2[row]["styles"][col] = style;
      } else {
        rowData2[row]["styles"][col] = Object.assign({}, rowData2[row]["styles"][col], style); // combine old and new styles
      }
      this.setState({
        rowData: rowData2
      });
      this.gridApi.setRowData(rowData2);
      // console.log("<TableViewer> updated style of (" + colName + rowName + ") by " + JSON.stringify(style) + ".");
    } else {
      // console.log("<TableViewer> updated nothing.");
    }
  }

  updateStyleByDict(dict, presets, override = false) {
    // dict = { "styleName": ["A1", "A2", ...] }
    // window.TableViewer.updateStyleByDict({ "data_region": ["A14", "A15"], "qualifier_region": ["B14", "B15"], "item": ["C14", "C15"] });
    let rowData2 = this.state.rowData;
    if (!rowData2) return;
    const styleNames = Object.keys(presets);
    for (let i = 0; i < styleNames.length; i++) {
      const styleName = styleNames[i];
      const cells = dict[styleName];
      if (cells === undefined) continue;
      for (let j = 0; j < cells.length; j++) {
        let [col, row] = cells[j].match(/[a-z]+|[^a-z]+/gi);
        row--;
        if (rowData2[row] === undefined) continue;
        if (rowData2[row][col] === undefined) continue;
        if (rowData2[row]["styles"] === undefined) { rowData2[row]["styles"] = {}; }
        if (override) {
          rowData2[row]["styles"][col] = presets[styleName];
        } else {
          rowData2[row]["styles"][col] = Object.assign({}, rowData2[row]["styles"][col], presets[styleName]); // combine old and new styles
        }
      }
    }
    this.setState({
      rowData: rowData2
    });
    // TODO: check this part
    this.gridApi.setRowData(rowData2);
  }

  updateTableData(tableData) {
    tableData.sheetData.columnDefs[0].pinned = "left"; // set first col pinned at left
    tableData.sheetData.columnDefs[0].width = 40; // set first col 40px width (max 5 digits, e.g. "12345")
    this.setState({
      filename: tableData.filename,
      isCSV: tableData.isCSV,
      sheetNames: tableData.sheetNames,
      currSheetName: tableData.currSheetName,
      columnDefs: tableData.sheetData.columnDefs,
      rowData: tableData.sheetData.rowData,
    });
    // this.gridColumnApi.autoSizeAllColumns();
  }

  updateYamlRegions(newYamlRegions = null) {
    if (newYamlRegions === null) {
      // reset
      const { yamlRegions } = this.state;
      if (yamlRegions === null) return;
      const presets = {
        item: { backgroundColor: "" },
        qualifierRegion: { backgroundColor: "" },
        dataRegion: { backgroundColor: "" },
        skippedRegion: { backgroundColor: "" }
      }
      this.updateStyleByDict(yamlRegions, presets);
      this.setState({ yamlRegions: null });
    } else {
      // update
      const presets = {
        item: { backgroundColor: "hsl(200, 50%, 90%)" }, // blue
        qualifierRegion: { backgroundColor: "hsl(250, 50%, 90%)" }, // violet
        dataRegion: { backgroundColor: "hsl(150, 50%, 90%)" }, // green
        skippedRegion: { backgroundColor: "hsl(0, 0%, 90%)" } // gray
      }
      this.updateStyleByDict(newYamlRegions, presets);
      this.setState({ yamlRegions: newYamlRegions });
    }
  }

  renderSheetSelector() {
    const { sheetNames, currSheetName } = this.state;

    // if csv file, sheetNames === null && currSheetName === null
    if (sheetNames === null) return;

    // else, excel file
    const currSheetStyle = { borderColor: "#339966", background: "#339966", padding: "0rem 0.5rem", margin: "0rem 0.25rem" };
    const otherSheetStyle = { borderColor: "#339966", background: "whitesmoke", color: "#339966", padding: "0rem 0.5rem", margin: "0rem 0.25rem" };
    let sheetSelectorHtml = [];
    for (let i = 0, len = sheetNames.length; i < len; i++) {
      sheetSelectorHtml.push(
        <Button
          key={i}
          variant="success"
          size="sm"
          style={sheetNames[i] === currSheetName ? currSheetStyle : otherSheetStyle}
          onClick={(event) => { this.handleSelectSheet(event) }}
        >{sheetNames[i]}</Button>
      );
    }
    return sheetSelectorHtml;
  }

  renderTableLegend() {
    return (
      <Popover className="shadow" style={{ backgroundColor: "rgba(255,255,255,0.8)" }}>
        <div style={{ margin: "10px 30px" }}>
          <span><strong>Legend</strong>:&nbsp;</span>
          <span className="legend" style={{ backgroundColor: "white", color: "hsl(200, 100%, 30%)", marginLeft: "0" }}>wikified</span>
          <span className="legend" style={{ backgroundColor: "hsl(200, 50%, 90%)" }}>item</span>
          <span className="legend" style={{ backgroundColor: "hsl(250, 50%, 90%)" }}>qualifier</span>
          <span className="legend" style={{ backgroundColor: "hsl(150, 50%, 90%)" }}>data</span>
          <span className="legend" style={{ backgroundColor: "hsl(0, 0%, 90%)" }}>data&nbsp;(skipped)</span>
        </div>
      </Popover>
    );
  }

  renderToastBody() {
    // get qnodeData from wikifier, e.g. { "A1": "Q967", ... }
    if (window.Wikifier === undefined) return;
    if (window.Wikifier.state === undefined) return;
    const { qnodeData } = window.Wikifier.state;
    if (qnodeData === undefined) return;

    // get qnode according to cell index, e.g. "Q967"
    const { selectedCell } = this.state;
    if (selectedCell === null) return;
    const selectedCellIndex = String(selectedCell.col) + String(selectedCell.row);
    const qnode = qnodeData[selectedCellIndex];
    if (qnode === undefined || qnode === "") return;

    // render qnode
    const qnodeHtml = (
      <a
        href={"https://www.wikidata.org/wiki/" + qnode}
        target="_blank"
        rel="noopener noreferrer"
        style={{ "color": "hsl(200, 100%, 30%)" }}
      >{qnode}</a>
    );

    // get cacheOfQnodes from wikifier, e.g. { "Q967": { "label": "Burundi", "description": "country in Africa" } }
    let { cacheOfQnodes } = window.Wikifier.state;
    if (cacheOfQnodes[qnode] === undefined || cacheOfQnodes[qnode]["label"] === "-") {
      // if not in cache, query to Wikidata
      const api = window.sparqlEndpoint + "?format=json&query=SELECT%20%3Flabel%20%3Fdesc%20WHERE%20%7B%0A%20%20wd%3A" + qnode + "%20rdfs%3Alabel%20%3Flabel%20%3B%0A%20%20%20%20%20%20%20%20%20%20%3Chttp%3A%2F%2Fschema.org%2Fdescription%3E%20%3Fdesc%20.%0A%20%20FILTER%20(langMatches(%20lang(%3Flabel)%2C%20%22EN%22%20)%20)%20%0A%20%20FILTER%20(langMatches(%20lang(%3Fdesc)%2C%20%22EN%22%20)%20)%20%0A%7D%0ALIMIT%201";
      fetch(api)
        .then(response => response.json())
        .then(json => {
          try {
            const label = json["results"]["bindings"][0]["label"]["value"];
            const description = json["results"]["bindings"][0]["desc"]["value"];
            cacheOfQnodes[qnode] = { "label": label, "description": description };
            window.Wikifier.setState({ cacheOfQnodes: cacheOfQnodes }); // add to cache
            this.setState({ showToast0: true }); // force update component
          } catch (error) {
            console.log(error)
          }
        });
      return (
        <Toast.Body>
          <strong>{selectedCell.value}</strong>&nbsp;({qnodeHtml})
        </Toast.Body>
      );
    } else {
      // qnode in cache
      const label = cacheOfQnodes[qnode]["label"];
      const description = cacheOfQnodes[qnode]["description"];
      return (
        <Toast.Body>
          <strong>{label}</strong>&nbsp;({qnodeHtml})<br />
          <br />
          {description}
        </Toast.Body>
      );
    }
  }

  render() {
    const { showSpinner, showToast0, showToast1, msgInToast1 } = this.state;
    const { filename, isCSV, columnDefs, rowData } = this.state;
    const { selectedCell } = this.state;

    let msgInToast0;
    if (selectedCell === null) {
      msgInToast0 = "No cell selected";
    } else {
      msgInToast0 = "{ $col: " + selectedCell.col + ", $row: " + selectedCell.row + " }";
    }

    // render title
    let titleHtml;
    if (!filename) {
      titleHtml = <span>Table&nbsp;Viewer</span>;
    } else {
      titleHtml = <span>{filename}<span style={{ color: "hsl(150, 50%, 70%)" }}>&nbsp;[Read-Only]</span></span>;
    }

    // render upload tooltip
    const uploadToolTipHtml = (
      <Tooltip style={{ width: "fit-content" }}>
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • Comma-Separated Values (.csv)<br />
          • Microsoft Excel (.xls/.xlsx)
        </div>
      </Tooltip>
    );

    return (
      <div className="w-100 h-100 p-1">
        <Card className="w-100 h-100 shadow-sm">

          {/* header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: "#339966" }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 75px)", cursor: "default" }}
            >
              {titleHtml}
            </div>

            {/* button to upload table file */}
            <OverlayTrigger overlay={uploadToolTipHtml} placement="bottom" trigger="hover">
              <Button
                className="d-inline-block float-right"
                variant="outline-light"
                size="sm"
                style={{ padding: "0rem 0.5rem" }}
                onClick={() => { document.getElementById("file_table").click(); }}
              >
                Upload
              </Button>
            </OverlayTrigger>

            {/* TODO: move following inputs to another place */}
            {/* hidden input of table file */}
            <input
              type="file"
              id="file_table"
              accept=".csv, .xls, .xlsx"
              style={{ display: "none" }}
              onChange={this.handleOpenTableFile}
              onClick={(event) => { event.target.value = null }}
            />

            {/* hidden input of wikifier file */}
            <input
              type="file"
              id="file_wikifier"
              accept=".csv"
              style={{ display: "none" }}
              onChange={this.handleOpenWikifierFile}
              onClick={(event) => { event.target.value = null }}
            />

          </Card.Header>

          {/* table */}
          <Card.Body className="ag-theme-balham w-100 h-100 p-0" style={{ overflow: "hidden" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* toasts */}
            <div className="myToast">

              {/* toast 0: showing details of selected cell */}
              <Toast
                onClose={() => this.setState({ showToast0: false })}
                style={showToast0 ? { display: "block" } : { display: "none" }}
              >
                <Toast.Header style={{ background: "whitesmoke" }}>
                  <span className="mr-auto font-weight-bold">
                    {msgInToast0}
                  </span>
                  <small>Pinned</small>
                </Toast.Header>
                {this.renderToastBody()}
              </Toast>

              {/* toast 1: showing message */}
              <Toast
                onClose={() => this.setState({ showToast1: false })}
                autohide delay={5000}
                show={showToast1} // this "show" and the following "display: none", both are needed
                style={showToast1 ? { display: "block" } : { display: "none" }}
              >
                <Toast.Header style={{ background: "whitesmoke" }}>
                  <span className="mr-auto font-weight-bold">
                    {msgInToast1}
                  </span>
                </Toast.Header>
              </Toast>

            </div>

            {/* popover */}
            <OverlayTrigger overlay={this.renderTableLegend()} trigger="hover" placement="left">
              <Button
                className="myPopover shadow"
                variant="secondary"
                style={this.state.isCSV ? { cursor: "default" } : { cursor: "default", bottom: "70px" }}
              >
                <FontAwesomeIcon icon={faQuestion} />
              </Button>
            </OverlayTrigger>

            {/* table */}
            {/* FUTURE: adapt large dataset by: https://github.com/NeXTs/Clusterize.js */}
            <AgGridReact
              onGridReady={this.onGridReady.bind(this)}
              columnDefs={columnDefs}
              rowData={rowData}
              rowDataChangeDetectionStrategy="IdentityCheck"
              suppressScrollOnNewData={true} // prevent unintended scrolling top after grid updated
              headerHeight={18}
              rowHeight={18}
              rowStyle={{ background: "white" }}
              defaultColDef={{
                // All options: https://www.ag-grid.com/javascript-grid-column-properties/

                // width
                width: 70,
                minWidth: 40,
                // maxWidth: 200,

                // others
                editable: false,
                lockPosition: true,
                resizable: true,
                // rowBuffer: 100,
                sortable: false,
                // suppressMaxRenderedRowRestriction: true, // 500 rows

                // color
                cellClass: function (params) {
                  if (params.colDef.field === "^") {
                    return ["cell", "cell-row-header"];
                  } else {
                    return "cell";
                  }
                },
                cellStyle: function (params) {
                  let col = params.colDef.field;
                  // let row = params.node.rowIndex;
                  if (params.data.styles && params.data.styles[col]) {
                    return params.data.styles[col];
                  }
                },

                // on cell clicked
                onCellClicked: this.handleSelectCell,

                // stop keyboard event
                suppressKeyboardEvent: function (params) { return true; },

                // custom cell renderer (to support hyperlink, ...), significantly degrade performance!
                // FUTURE: only use custom cell renderer when backend requires
                // cellRendererFramework: Cell

              }}
            >
            </AgGridReact>
          </Card.Body>

          {/* sheet selector */}
          <Card.Footer
            hidden={isCSV}
            id="sheetSelector" // apply custom scroll bar
            style={{
              height: "50px",
              padding: "0.5rem 0.75rem",
              background: "whitesmoke",
              // overflow: "scroll hidden", // safari does not support this
              overflowX: "scroll",
              overflowY: "hidden",
              whiteSpace: "nowrap"
            }}
          >
            {this.renderSheetSelector()}
          </Card.Footer>
        </Card>
      </div>
    );
  }
}

//                                   dddddddd                                                                   
// EEEEEEEEEEEEEEEEEEEEEE            d::::::d  iiii          tttt                                               
// E::::::::::::::::::::E            d::::::d i::::i      ttt:::t                                               
// E::::::::::::::::::::E            d::::::d  iiii       t:::::t                                               
// EE::::::EEEEEEEEE::::E            d:::::d              t:::::t                                               
//   E:::::E       EEEEEE    ddddddddd:::::d iiiiiiittttttt:::::ttttttt       ooooooooooo   rrrrr   rrrrrrrrr   
//   E:::::E               dd::::::::::::::d i:::::it:::::::::::::::::t     oo:::::::::::oo r::::rrr:::::::::r  
//   E::::::EEEEEEEEEE    d::::::::::::::::d  i::::it:::::::::::::::::t    o:::::::::::::::or:::::::::::::::::r 
//   E:::::::::::::::E   d:::::::ddddd:::::d  i::::itttttt:::::::tttttt    o:::::ooooo:::::orr::::::rrrrr::::::r
//   E:::::::::::::::E   d::::::d    d:::::d  i::::i      t:::::t          o::::o     o::::o r:::::r     r:::::r
//   E::::::EEEEEEEEEE   d:::::d     d:::::d  i::::i      t:::::t          o::::o     o::::o r:::::r     rrrrrrr
//   E:::::E             d:::::d     d:::::d  i::::i      t:::::t          o::::o     o::::o r:::::r            
//   E:::::E       EEEEEEd:::::d     d:::::d  i::::i      t:::::t    tttttto::::o     o::::o r:::::r            
// EE::::::EEEEEEEE:::::Ed::::::ddddd::::::ddi::::::i     t::::::tttt:::::to:::::ooooo:::::o r:::::r            
// E::::::::::::::::::::E d:::::::::::::::::di::::::i     tt::::::::::::::to:::::::::::::::o r:::::r            
// E::::::::::::::::::::E  d:::::::::ddd::::di::::::i       tt:::::::::::tt oo:::::::::::oo  r:::::r            
// EEEEEEEEEEEEEEEEEEEEEE   ddddddddd   dddddiiiiiiii         ttttttttttt     ooooooooooo    rrrrrrr            

class Editors extends React.Component {
  constructor(props) {
    super(props);

    // init global variables
    window.Editors = this;

    // init state
    this.state = {
      nowShowing: "Wikifier",
    };
  }

  render() {
    const { nowShowing } = this.state;
    return (
      <div className="w-100 h-100 p-1">
        <Wikifier isShowing={nowShowing === "Wikifier"} />
        <YamlEditor isShowing={nowShowing === "YamlEditor"} />
      </div>
    );
  }
}

// WWWWWWWW                           WWWWWWWW iiii  kkkkkkkk             iiii  
// W::::::W                           W::::::Wi::::i k::::::k            i::::i 
// W::::::W                           W::::::W iiii  k::::::k             iiii  
// W::::::W                           W::::::W       k::::::k                   
//  W:::::W           WWWWW           W:::::Wiiiiiii  k:::::k    kkkkkkkiiiiiii 
//   W:::::W         W:::::W         W:::::W i:::::i  k:::::k   k:::::k i:::::i 
//    W:::::W       W:::::::W       W:::::W   i::::i  k:::::k  k:::::k   i::::i 
//     W:::::W     W:::::::::W     W:::::W    i::::i  k:::::k k:::::k    i::::i 
//      W:::::W   W:::::W:::::W   W:::::W     i::::i  k::::::k:::::k     i::::i 
//       W:::::W W:::::W W:::::W W:::::W      i::::i  k:::::::::::k      i::::i 
//        W:::::W:::::W   W:::::W:::::W       i::::i  k:::::::::::k      i::::i 
//         W:::::::::W     W:::::::::W        i::::i  k::::::k:::::k     i::::i 
//          W:::::::W       W:::::::W        i::::::ik::::::k k:::::k   i::::::i
//           W:::::W         W:::::W         i::::::ik::::::k  k:::::k  i::::::i
//            W:::W           W:::W          i::::::ik::::::k   k:::::k i::::::i
//             WWW             WWW           iiiiiiiikkkkkkkk    kkkkkkkiiiiiiii

class Wikifier extends React.Component {
  constructor(props) {
    super(props);

    // init global variables
    window.Wikifier = this;

    // init state
    this.state = {

      // appearance
      showSpinner: false,

      // wikifier data (from backend)
      qnodeData: {},  // e.g. { "A1": "Q111", "A2": "Q222", ... }
      regionData: {}, // e.g. { "A1:A9": [ "A1", "A2", ... ], ... }

      // wikifier data used to render
      currRegion: "All",
      rowData: [], // e.g. [{ "cell": "A1", "value": "Burundi", "qnode": "Q967", "label": "Burundi", "description": "country in Africa" }]
      scope: 0,
      cacheOfQnodes: {}, // e.g. { "Q967": { "label": "Burundi", "description": "country in Africa"}, ... }

    };
  }

  onGridReady(params) {
    // store the api
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    // console.log("<Wikifier> inited ag-grid and retrieved its API");

    // for test only
    // const qnodeData = { "A1": "Q966", "B1": "Q967", "C1": "Q968", "A4": "Q969", "A5": "Q970" };
    // const regionData = { "A1:Z1": ["A1", "B1", "C1"], "Other": ["A4", "A5"] };
    // this.updateWikifier(qnodeData, regionData);

    this.gridApi.sizeColumnsToFit();
  }

  handleAddRegion() {
    let tempNewRegion = this.refs.tempNewRegion.value.trim();

    // validate input
    if (!/^[a-z]+\d+:[a-z]+\d+$/i.test(tempNewRegion) || !utils.isValidRegion(tempNewRegion)) {
      alert("Error: Invalid region.\n\nRegion must:\n* be defined as A1:B2, etc.\n* start from top left cell and end in bottom right cell.");
      return;
    }

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    console.log("<Wikifier> -> %c/call_wikifier_service%c to add region: %c" + tempNewRegion, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("action", "add_region");
    formData.append("region", tempNewRegion);
    fetch(window.server + "/call_wikifier_service", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { qnodes, regions } = json;
      window.TableViewer.updateQnodeCells(qnodes, regions);
      // FUTURE: the following line is unstable
      this.handleSelectRegion(tempNewRegion);

      // follow-ups (success)
      this.setState({
        showSpinner: false
      });
      this.refs.tempNewRegion.value = "";

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      window.TableViewer.updateQnodeCells();
      this.setState({ showSpinner: false });
    });
  }

  handleDeleteRegion(region) {

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    console.log("<Wikifier> -> %c/call_wikifier_service%c to delete region: %c" + region, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("action", "delete_region");
    formData.append("region", region);
    fetch(window.server + "/call_wikifier_service", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { qnodes, regions } = json;
      window.TableViewer.updateQnodeCells(qnodes, regions);

      // follow-ups (success)
      this.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      window.TableViewer.updateQnodeCells();
      this.setState({ showSpinner: false });
    });
  }

  handleSelectRegion(region) {
    if (region === this.state.currRegion) return;

    // switch region
    console.log("<Wikifier> selected region: %c" + region, LOG.highlight);
    this.setState({ currRegion: region });

    // update wikifier output
    this.updateRowData(region);
  }

  handleUpdateQnode(params) {
    const { cell, qnode } = params["data"];
    let { currRegion, scope } = this.state;

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    console.log("<Wikifier> -> %c/call_wikifier_service%c to update qnode: %c" + cell + " (" + qnode + ")", LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("action", "update_qnode");
    formData.append("region", currRegion);
    formData.append("cell", cell);
    formData.append("qnode", qnode);
    formData.append("apply_to", scope);
    fetch(window.server + "/call_wikifier_service", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<Wikifier> <- %c/call_wikifier_service%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { qnodes, regions } = json;
      window.TableViewer.updateQnodeCells(qnodes, regions);
      this.handleSelectRegion(currRegion);

      // follow-ups (success)
      this.setState({ showSpinner: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      window.TableViewer.updateQnodeCells();
      this.setState({ showSpinner: false });
    });
  }

  updateCacheQnode(qnodes = null) {
    // param: qnodes, e.g. ["Q111", "Q222", "Q333", ...]

    // if no input, cache all qnodes
    if (qnodes === null) qnodes = Object.values(this.state.qnodeData);
    qnodes = Array.from(new Set(qnodes));

    // remove qnodes that already cached
    const cached = Object.keys(this.state.cacheOfQnodes);
    qnodes = qnodes.filter(function (x) { return cached.indexOf(x) === -1 });

    // cache qnode
    if (qnodes.length === 0) return;
    this.setState({ showSpinner: true });
    const api = window.sparqlEndpoint + "?format=json&query=SELECT%20%3Fqnode%20%28MIN%28%3Flabel%29%20AS%20%3Flabel_%29%20%28MIN%28%3Fdesc%29%20AS%20%3Fdesc_%29%20WHERE%20%7B%0A%20%20VALUES%20%3Fqnode%20%7B%20wd%3A" + qnodes.join("%20wd%3A") + "%7D%0A%20%20%3Fqnode%20rdfs%3Alabel%20%3Flabel%3B%20<http%3A%2F%2Fschema.org%2Fdescription>%20%3Fdesc.%0A%20%20FILTER%20%28langMatches%28lang%28%3Flabel%29%2C%22EN%22%29%29%0A%20%20FILTER%20%28langMatches%28lang%28%3Fdesc%29%2C%22EN%22%29%29%0A%7D%0AGROUP%20BY%20%3Fqnode";
    fetch(api)
      .then(response => response.json())
      .then(json => {
        console.log("<Wikifier> updated %cqnode cache", LOG.highlight);
        console.log(json);

        let { cacheOfQnodes } = this.state;

        // update qnode by query results from sparql endpoint
        const bindings = json["results"]["bindings"];
        for (let i = 0, len = bindings.length; i < len; i++) {
          const qnode = json["results"]["bindings"][i]["qnode"]["value"].match(/[QP]\d+$/)[0];
          const label = json["results"]["bindings"][i]["label_"]["value"];
          const description = json["results"]["bindings"][i]["desc_"]["value"];
          cacheOfQnodes[qnode] = { "label": label, "description": description };
        }

        // update mismatched qnodes (for clear qnode cache feature)
        for (let i = 0, len = qnodes.length; i < len; i++) {
          const qnode = qnodes[i];
          if (cacheOfQnodes[qnode] === undefined) {
            cacheOfQnodes[qnode] = { "label": "-", "description": "-" };
          }
        }

        // update state
        this.setState({ cacheOfQnodes: cacheOfQnodes });
        this.updateRowData();

        // follow-ups (success)
        console.log(cacheOfQnodes);
        this.setState({ showSpinner: false });

      }).catch((error) => {
        console.log(error);

        // follow-ups (failure)
        this.setState({ showSpinner: false });
      });
  }

  updateRowData(region = null) {
    const { qnodeData, regionData, currRegion, cacheOfQnodes } = this.state;
    if (region === null) region = currRegion;
    const tableData = window.TableViewer.state.rowData;

    // get cell list shown in first col
    let cells;
    if (region === "All") {
      cells = utils.sortCells(Object.keys(qnodeData));
    } else {
      cells = regionData[region];
    }

    // fill table
    let rowData = new Array(cells.length);
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const [col, row] = cell.match(/[a-z]+|[^a-z]+/gi);
      const value = tableData[parseInt(row) - 1][col];
      const qnode = qnodeData[cell];

      // one-row data
      let rowDatum = {
        "cell": cell,
        "value": value,
        "qnode": qnode,
        "label": "...",
        "description": "..."
      };
      if (qnode === "") {
        rowDatum["label"] = "";
        rowDatum["description"] = "";
      }
      if (cacheOfQnodes[qnode] !== undefined) {
        rowDatum["label"] = cacheOfQnodes[qnode]["label"];
        rowDatum["description"] = cacheOfQnodes[qnode]["description"];
      }

      // appand this one-row data
      rowData[i] = rowDatum;
    }
    this.setState({ rowData: rowData });

    if (rowData.length === 0) {
      this.gridApi.sizeColumnsToFit();
    } else {
      this.gridApi.sizeColumnsToFit();
      // this.gridColumnApi.autoSizeAllColumns();
    }
  }

  updateWikifier(qnodeData = null, regionData = null) {
    if (qnodeData === null) {
      // reset
      this.setState({
        qnodeData: {},
        regionData: {},
        currRegion: "All",
        rowData: [],
      });
    } else {
      // update
      this.updateCacheQnode(Object.values(qnodeData));
      this.setState({
        qnodeData: qnodeData,
        regionData: regionData,
        currRegion: "All",
        rowData: [],
      });
      this.updateRowData();
    }
  }

  renderRegionSelector() {
    const { regionData, currRegion } = this.state;
    const regions = Object.keys(regionData);

    let regionSelectorHtml = [];

    // all
    regionSelectorHtml.push(
      <RegionTab
        key="All"
        region="All"
        selected={(currRegion === "All") ? true : false}
        handleSelectRegion={() => this.handleSelectRegion("All")}
        handleDeleteRegion={(event) => {
          event.stopPropagation(); // prevent selecting deleted region
          this.handleDeleteRegion("All");
        }}
      />
    );

    // regions
    for (let i = 0, len = regions.length; i < len; i++) {
      regionSelectorHtml.push(
        <RegionTab
          key={regions[i]}
          region={regions[i]}
          selected={(regions[i] === currRegion) ? true : false}
          handleSelectRegion={() => this.handleSelectRegion(regions[i])}
          handleDeleteRegion={(event) => {
            event.stopPropagation(); // prevent selecting deleted region
            this.handleDeleteRegion(regions[i]);
          }}
        />
      );
    }

    // add region
    regionSelectorHtml.push(
      <div
        key="Add"
        className="w-100"
        style={{
          height: "32px",
          position: "relative",
          borderBottom: "1px solid lightgray"
        }}
      >
        <div
          style={{
            width: "100%",
            padding: "0px 10px 0px 8px",
            position: "absolute",
            top: "50%",
            msTransform: "translateY(-50%)",
            transform: "translateY(-50%)",
            fontSize: "12px"
          }}
        >
          <input
            ref="tempNewRegion"
            type="text"
            style={{
              display: "inline-block",
              width: "calc(100% - 17px)"
            }}
            // value={this.state.input}
            placeholder="e.g. A1:B2"
            readOnly={this.state.showSpinner}
            // onChange={(event) => {
            //   this.setState({ input: event.target.value });
            // }}
            onKeyPress={(event) => {
              if (event.key === "Enter") {
                // if press enter (13), then do add region
                event.preventDefault();
                this.handleAddRegion();
              }
            }}
          />
          <span
            className="myTextButton"
            style={{
              display: "inline-block",
              width: "10px",
              cursor: "pointer",
              marginLeft: "5px",
              // fontWeight: "bold",
              fontSize: "14px",
              color: "hsl(150, 50%, 40%)"
            }}
            title="Add region"
            onClick={this.handleAddRegion.bind(this)}
          >＋</span>
        </div>
      </div>
    );

    return regionSelectorHtml;
  }

  renderWikifierOutput() {
    const { rowData } = this.state;
    return (
      <AgGridReact
        onGridReady={this.onGridReady.bind(this)}
        frameworkComponents={{
          qnodeEditor: QnodeEditor
        }}
        columnDefs={[
          {
            headerName: "Table",
            children: [
              { headerName: "cell", field: "cell", width: 40 },
              { headerName: "value", field: "value", width: 70 },
            ]
          },
          {
            headerName: "Wikidata",
            children: [
              {
                headerName: "item", field: "qnode", width: 70, // just show as "item"
                cellStyle: { color: "hsl(200, 100%, 30%)" },
                editable: true, cellEditor: "qnodeEditor",
                onCellValueChanged: (params) => { this.handleUpdateQnode(params) }
              },
              { headerName: "label", field: "label", width: 70 },
              { headerName: "description", field: "description", width: 140 }
            ]
          }
        ]}
        rowData={rowData}
        suppressScrollOnNewData={true}
        headerHeight={18}
        rowHeight={18}
        rowStyle={{ background: "white" }}
        defaultColDef={{
          minWidth: 40,
          lockPosition: true,
          resizable: true,
          sortable: false,
        }}
      >
      </AgGridReact>
    );
  }

  render() {

    // render upload tooltip
    const uploadToolTipHtml = (
      <Tooltip style={{ width: "fit-content" }}>
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • Comma-Separated Values (.csv)
        </div>
      </Tooltip>
    );

    return (
      <Card
        className="w-100 shadow-sm"
        style={(this.props.isShowing) ? { height: "calc(100% - 40px)" } : { height: "40px" }}
      >

        {/* header */}
        <Card.Header
          style={{ height: "40px", padding: "0.5rem 1rem", background: "#006699" }}
          onClick={() => window.Editors.setState({ nowShowing: "Wikifier" })}
        >

          {/* title */}
          <div
            className="text-white font-weight-bold d-inline-block text-truncate"
            style={{ width: "calc(100% - 75px)", cursor: "default" }}
          >
            Wikifier
          </div>

          {/* button to upload wikifier file */}
          <OverlayTrigger overlay={uploadToolTipHtml} placement="bottom" trigger="hover">
            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem" }}
              onClick={() => { document.getElementById("file_wikifier").click(); }}
            >
              Upload
            </Button>
          </OverlayTrigger>

        </Card.Header>

        {/* wikifier */}
        <Card.Body
          className="w-100 h-100 p-0"
          style={
            // (this.props.isShowing) ? { overflow: "hidden" } : { display: "none" }
            { display: "flex", overflow: "hidden" }
          }
        >

          {/* loading spinner */}
          <div className="mySpinner" hidden={!this.state.showSpinner} style={(this.props.isShowing) ? {} : { display: "none" }}>
            <Spinner animation="border" />
          </div>

          {/* region selector */}
          <div
            className="h-100 shadow-sm"
            style={{
              display: "inline-block",
              width: "128px",
              background: "whitesmoke",
              border: "1px solid lightgray",
              overflowX: "hidden",
              overflowY: "auto",
              whiteSpace: "nowrap",
              zIndex: "200"
            }}
          >
            {this.renderRegionSelector()}
          </div>

          {/* wikifier output */}
          <div
            className="ag-theme-balham h-100"
            style={{
              display: "inline-block",
              width: "calc(100% - 128px)",
              overflow: "hidden"
            }}
          >
            {this.renderWikifierOutput()}
          </div>
        </Card.Body>

        {/* card footer */}
        {/* <Card.Footer
          style={
            (this.props.isShowing) ? { height: "40px", padding: "0.5rem 1rem", background: "whitesmoke" } : { display: "none" }
          }
        >
          <Button
            className="d-inline-block float-right"
            size="sm"
            style={{ borderColor: "#006699", background: "#006699", padding: "0rem 0.5rem" }}
          // onClick={this.handleApply.bind(this)}
          // disabled={!this.state.isValidYaml}
          >
            Download
          </Button>
        </Card.Footer> */}

      </Card >
    );
  }
}

class RegionTab extends React.Component {
  render() {
    const verticalCenteredHtml = (
      <div
        style={{
          width: "100%",
          padding: "0px 10px",
          position: "absolute",
          top: "50%",
          msTransform: "translateY(-50%)",
          transform: "translateY(-50%)",
          fontSize: "12px"
        }}
      >
        <span
          title={this.props.region}
          style={{
            display: "inline-block",
            width: "calc(100% - 15px)",
            cursor: "default"
          }}
        >{this.props.region}</span>
        <span
          className="myTextButton"
          style={{
            display: "inline-block",
            width: "10px",
            cursor: "pointer",
            marginLeft: "5px",
            // fontWeight: "bold",
            color: "hsl(0, 100%, 30%)"
          }}
          title="Delete region"
          onClick={(event) => this.props.handleDeleteRegion(event)}
        >✕</span>
      </div>
    );

    let regionTabHtml;
    if (this.props.selected) {
      regionTabHtml = (
        <div
          className="w-100"
          style={{
            height: "32px",
            position: "relative",
            borderBottom: "1px solid lightgray",
            background: "hsl(200, 100%, 90%)"
          }}
          onClick={this.props.handleSelectRegion}
        >{verticalCenteredHtml}</div>
      );
    } else {
      regionTabHtml = (
        <div
          className="w-100"
          style={{
            height: "32px",
            position: "relative",
            borderBottom: "1px solid lightgray"
          }}
          onClick={this.props.handleSelectRegion}
        >{verticalCenteredHtml}</div>
      );
    }
    return regionTabHtml;
  }
}

class QnodeEditor extends React.Component {
  constructor(props) {
    super(props);
    // console.log(props);

    // init state
    this.state = this.createInitState(props);
    // this.state = {
    //   value: this.props.value,
    //   scope: 0,
    //   highlightAllOnFocus: false,
    //   cancelAfterEnd: true,
    //   isValidValue: true,
    // };
    window.Wikifier.setState({ scope: 0 });

    // init functions
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentDidMount() {
    this.refs.tempQnodeEditor.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    this.refs.tempQnodeEditor.removeEventListener('keydown', this.handleKeyDown);
  }

  createInitState(props) {
    if (props.keyPress === 8 || props.keyPress === 46) {
      // if BACKSPACE (8) or DELETE (46) pressed, we clear the cell
      return {
        value: "",
        scope: 0,
        highlightAllOnFocus: false,
        cancelAfterEnd: true,
        isValidValue: true
      };
    } else if (props.charPress) {
      // if a letter was pressed, we start with the letter
      return {
        value: props.charPress,
        scope: 0,
        highlightAllOnFocus: false,
        cancelAfterEnd: true,
        isValidValue: true
      };
    } else {
      // otherwise we start with the current value
      return {
        value: props.value,
        scope: 0,
        highlightAllOnFocus: true,
        cancelAfterEnd: true,
        isValidValue: true
      };
    }
  }

  afterGuiAttached() {
    // get ref from React component
    const eInput = this.refs.tempQnodeEditor;
    eInput.focus();
    if (this.state.highlightAllOnFocus) {
      eInput.select();
      this.setState({ highlightAllOnFocus: false })
    } else {
      // when we started editing, we want the carot at the end, not the start.
      // this comes into play in two scenarios: a) when user hits F2 and b)
      // when user hits a printable character, then on IE (and only IE) the carot
      // was placed after the first character, thus 'apply' would end up as 'pplea'
      const length = eInput.value ? eInput.value.length : 0;
      if (length > 0) {
        eInput.setSelectionRange(length, length);
      }
    }
  }

  getValue() {
    return this.state.value;
  }

  handleChangeValue(value) {
    let isValidValue;
    if (/^Q\d+$/.test(value) || /^$/.test(value)) {
      // valid if "Q..." or ""
      isValidValue = true;
    } else {
      isValidValue = false;
    }
    this.setState({
      value: value,
      isValidValue: isValidValue
    });
  }

  handleChangeScope(scope) {
    this.setState({ scope: scope });
    window.Wikifier.setState({ scope: scope });
  }

  handleClickUpdateQnode() {
    this.setState({ cancelAfterEnd: false });
    // this.props.stopEditing(false);
    setTimeout(this.handleStopEditing.bind(this), 100);
  }

  handleDeleteQnode() {
    this.setState({ value: "", cancelAfterEnd: false });
    // this.props.stopEditing(false);
    setTimeout(this.handleStopEditing.bind(this), 100);
  }

  handleKeyDown(event) {
    if ([37, 39, 8, 46].indexOf(event.keyCode) > -1) {
      // if LEFT (37) or RIGHT (39) or BACKSPACE (8) or DELETE (46) pressed, we clear the cell
      event.stopPropagation();
      return;
    }
  }

  handleStopEditing() {
    this.props.stopEditing(false); // cancel = false
  }

  isCancelAfterEnd() {
    const { cancelAfterEnd, isValidValue } = this.state;
    if (!cancelAfterEnd && isValidValue) {
      return false;
    } else {
      // others, do cancel
      return true;
    }
  };

  isCancelBeforeStart() {
    // return this.props.charPress && ('0123456789'.indexOf(this.props.charPress) < 0);
    return false;
  }

  isPopup() {
    return true;
  }

  render() {
    const { value, scope, isValidValue } = this.state;

    // scope button styles
    const currScopeStyle = {
      padding: "0rem 0.5rem",
      color: "white",
      background: "hsl(200, 100%, 30%)",
      border: "1px solid hsl(200, 100%, 30%)"
    };
    const otherScopeStyle = {
      padding: "0rem 0.5rem",
      color: "hsl(200, 100%, 30%)",
      background: "",
      border: "1px solid hsl(200, 100%, 30%)"
    };

    // scope button tooltips
    const scope0TooltipHtml = (
      <Tooltip style={{ width: "fit-content" }}>
        <div className="text-left small">
          Apply to this cell only
        </div>
      </Tooltip>
    );
    const scope1TooltipHtml = (
      <Tooltip style={{ width: "fit-content" }}>
        <div className="text-left small">
          Apply to all cells with same value in this region
        </div>
      </Tooltip>
    );
    const scope2TooltipHtml = (
      <Tooltip style={{ width: "fit-content" }}>
        <div className="text-left small">
          Apply to all cells with same value in all regions
        </div>
      </Tooltip>
    );

    return (
      <div>

        {/* input */}
        <input
          ref="tempQnodeEditor"
          value={value}
          onChange={(event) => this.handleChangeValue(event.target.value)}
          style={isValidValue ? { width: "100%" } : { width: "100%", borderColor: "red" }}
        />

        <div style={{ padding: "5px", fontSize: "12px", lineHeight: "16px" }}>

          {/* apply to */}
          <div style={{ padding: "5px", background: "whitesmoke", borderRadius: "4px" }}>
            <span style={{ fontWeight: "600" }}>
              Scope:&nbsp;
            </span>
            <ButtonGroup>
              <OverlayTrigger overlay={scope0TooltipHtml} placement="bottom" trigger="hover">
                <Button
                  variant="outline-light"
                  size="sm"
                  style={(scope === 0) ? currScopeStyle : otherScopeStyle}
                  onClick={() => this.handleChangeScope(0)}
                >
                  Cell
                </Button>
              </OverlayTrigger>
              <OverlayTrigger overlay={scope1TooltipHtml} placement="bottom" trigger="hover">
                <Button
                  variant="outline-light"
                  size="sm"
                  style={(scope === 1) ? currScopeStyle : otherScopeStyle}
                  disabled={window.Wikifier.state.currRegion === "All"}
                  onClick={() => this.handleChangeScope(1)}
                >
                  Region
                </Button>
              </OverlayTrigger>
              <OverlayTrigger overlay={scope2TooltipHtml} placement="bottom" trigger="hover">
                <Button
                  variant="outline-light"
                  size="sm"
                  style={(scope === 2) ? currScopeStyle : otherScopeStyle}
                  onClick={() => this.handleChangeScope(2)}
                >
                  All
                </Button>
              </OverlayTrigger>
            </ButtonGroup>
          </div>

          {/* buttons */}
          <div style={{ height: "30px", paddingTop: "5px", paddingBottom: "5px" }}>
            <Button
              className="d-inline-block float-left"
              variant="danger"
              size="sm"
              style={{
                padding: "0rem 0.5rem",
                color: "white",
                background: "hsl(0, 100%, 30%)",
                border: "1px solid hsl(0, 100%, 30%)"
              }}
              disabled={isValidValue ? false : true}
              onClick={this.handleDeleteQnode.bind(this)}
            >
              Delete
            </Button>
            <Button
              className="d-inline-block float-right"
              variant="success"
              size="sm"
              style={{
                padding: "0rem 0.5rem",
                color: "white",
                background: "hsl(150, 50%, 40%)",
                border: "1px solid hsl(150, 50%, 40%)"
              }}
              disabled={isValidValue ? false : true}
              onClick={this.handleClickUpdateQnode.bind(this)}
            >
              Update
            </Button>
          </div>

        </div>
      </div>
    );
  }
}

// YYYYYYY       YYYYYYY           AAA               MMMMMMMM               MMMMMMMMLLLLLLLLLLL             
// Y:::::Y       Y:::::Y          A:::A              M:::::::M             M:::::::ML:::::::::L             
// Y:::::Y       Y:::::Y         A:::::A             M::::::::M           M::::::::ML:::::::::L             
// Y::::::Y     Y::::::Y        A:::::::A            M:::::::::M         M:::::::::MLL:::::::LL             
// YYY:::::Y   Y:::::YYY       A:::::::::A           M::::::::::M       M::::::::::M  L:::::L               
//    Y:::::Y Y:::::Y         A:::::A:::::A          M:::::::::::M     M:::::::::::M  L:::::L               
//     Y:::::Y:::::Y         A:::::A A:::::A         M:::::::M::::M   M::::M:::::::M  L:::::L               
//      Y:::::::::Y         A:::::A   A:::::A        M::::::M M::::M M::::M M::::::M  L:::::L               
//       Y:::::::Y         A:::::A     A:::::A       M::::::M  M::::M::::M  M::::::M  L:::::L               
//        Y:::::Y         A:::::AAAAAAAAA:::::A      M::::::M   M:::::::M   M::::::M  L:::::L               
//        Y:::::Y        A:::::::::::::::::::::A     M::::::M    M:::::M    M::::::M  L:::::L               
//        Y:::::Y       A:::::AAAAAAAAAAAAA:::::A    M::::::M     MMMMM     M::::::M  L:::::L         LLLLLL
//        Y:::::Y      A:::::A             A:::::A   M::::::M               M::::::MLL:::::::LLLLLLLLL:::::L
//     YYYY:::::YYYY  A:::::A               A:::::A  M::::::M               M::::::ML::::::::::::::::::::::L
//     Y:::::::::::Y A:::::A                 A:::::A M::::::M               M::::::ML::::::::::::::::::::::L
//     YYYYYYYYYYYYYAAAAAAA                   AAAAAAAMMMMMMMM               MMMMMMMMLLLLLLLLLLLLLLLLLLLLLLLL

class YamlEditor extends React.Component {
  constructor(props) {
    super(props);

    // init global variables
    window.YamlEditor = this;

    // init state
    const defaultYamlText = "### A simplest sample of T2WML.\n### Replace all #PLACEHOLDER below to start.\nstatementMapping:\n  region:\n    - left: #CHAR\n      right: #CHAR\n      top: #INT\n      bottom: #INT\n  template:\n    item: #EXPRESSION/QNODE\n    property: #EXPRESSION/PNODE\n    value: #EXPRESSION/VALUE\n    qualifier:\n      - property: #EXPRESSION/PNODE\n        value: #EXPRESSION/VALUE";
    this.state = {

      // appearance

      // yaml
      yamlText: defaultYamlText,
      yamlJson: null,
      isValidYaml: true,
      errMsg: "",
      errStack: "",

    };

    // init functions
    this.handleOpenYamlFile = this.handleOpenYamlFile.bind(this);
  }

  handleApplyYaml(event) {
    console.log("<YamlEditor> clicked apply");

    // remove current status
    window.TableViewer.updateYamlRegions();
    window.Output.removeOutput();

    // before sending request
    window.TableViewer.setState({ showSpinner: true });

    // send request
    console.log("<YamlEditor> -> %c/upload_yaml%c for yaml regions", LOG.link, LOG.default);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("yaml", this.state.yamlText);
    // const sheetName = window.TableViewer.state.currSheetName;
    // if (sheetName !== null) {
    //   formData.append("sheet_name", sheetName)
    // }
    fetch(window.server + "/upload_yaml", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then(response => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then(response => {
      return response.json();
    }).then(json => {
      console.log("<YamlEditor> <- %c/upload_yaml%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { yamlRegions } = json;
      window.TableViewer.updateYamlRegions(yamlRegions);

      // follow-ups (success)
      window.TableViewer.setState({ showSpinner: false });
      window.Output.setState({ isDownloadDisabled: false });
      window.isCellSelectable = true;

    }).catch((error) => {
      console.log(error);
      alert("Failed to apply. 🙁\n\n" + error);

      // follow-ups (failure)
      window.TableViewer.setState({ showSpinner: false });
    });
  }

  handleChangeYaml(event) {
    window.isCellSelectable = false;

    const yamlText = this.refs.monaco.editor.getModel().getValue();
    this.setState({ yamlText: yamlText });
    try {
      let yamlJson = yaml.safeLoad(yamlText);
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        errMsg: null,
        errStack: null,
      });
    } catch (err) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        errMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
        errStack: err.stack,
      });
    }
  }

  handleOpenYamlFile(event) {
    // get file
    const file = event.target.files[0];
    if (!file) return;
    console.log("<YamlEditor> opened file: " + file.name);

    window.isCellSelectable = false;

    // upload local yaml
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onloadend = (() => {
      const yamlText = reader.result;
      this.setState({ yamlText: yamlText });
      try {
        const yamlJson = yaml.safeLoad(yamlText);
        this.setState({
          yamlJson: yamlJson,
          isValidYaml: true,
          errMsg: null,
          errStack: null
        });
      } catch (err) {
        this.setState({
          yamlJson: null,
          isValidYaml: false,
          errMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
          errStack: err.stack
        });
      }
    });
  }

  updateYamlText(yamlText = null) {
    let newYamlText = yamlText;
    if (newYamlText === null) {
      const defaultYamlText = "### A simplest sample of T2WML.\n### Replace all #PLACEHOLDER below to start.\nstatementMapping:\n  region:\n    - left: #CHAR\n      right: #CHAR\n      top: #INT\n      bottom: #INT\n  template:\n    item: #EXPRESSION/QNODE\n    property: #EXPRESSION/PNODE\n    value: #EXPRESSION/VALUE\n    qualifier:\n      - property: #EXPRESSION/PNODE\n        value: #EXPRESSION/VALUE";
      newYamlText = defaultYamlText;
    }
    this.setState({ yamlText: newYamlText });
    try {
      const yamlJson = yaml.safeLoad(newYamlText);
      this.setState({
        yamlJson: yamlJson,
        isValidYaml: true,
        errMsg: null,
        errStack: null
      });
    } catch (err) {
      this.setState({
        yamlJson: null,
        isValidYaml: false,
        errMsg: "⚠️ " + err.message.match(/[^:]*(?=:)/)[0],
        errStack: err.stack
      });
    }
  }

  render() {
    const { yamlText } = this.state;

    // render upload tooltip
    const uploadToolTipHtml = (
      <Tooltip style={{ width: "fit-content" }}>
        <div className="text-left small">
          <b>Accepted file types:</b><br />
          • YAML Ain't Markup Language (.yaml)
        </div>
      </Tooltip>
    );

    return (
      <Card
        className="w-100 shadow-sm"
        style={(this.props.isShowing) ? { height: "calc(100% - 40px)" } : { height: "40px" }}
      >

        {/* header */}
        <Card.Header
          style={{ height: "40px", padding: "0.5rem 1rem", background: "#006699" }}
          onClick={() => window.Editors.setState({ nowShowing: "YamlEditor" })}
        >

          {/* title */}
          <div
            className="text-white font-weight-bold d-inline-block text-truncate"
            style={{ width: "calc(100% - 75px)", cursor: "default" }}
          >
            YAML&nbsp;Editor
          </div>

          {/* button of open yaml file */}
          <OverlayTrigger overlay={uploadToolTipHtml} placement="bottom" trigger="hover">
            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem" }}
              onClick={() => { document.getElementById("file_yaml").click(); }}
            >
              Upload
            </Button>
          </OverlayTrigger>

          {/* TODO: move following input to another place */}
          {/* hidden input of yaml file */}
          <input
            type="file"
            id="file_yaml"
            accept=".yaml"
            style={{ display: "none" }}
            onChange={this.handleOpenYamlFile}
            onClick={(event) => { event.target.value = null }}
          />

        </Card.Header>

        {/* yaml editor */}
        <Card.Body
          className="w-100 h-100 p-0"
          style={(this.props.isShowing) ? { overflow: "hidden" } : { display: "none" }}
        >
          <MonacoEditor
            ref="monaco"
            width="100%"
            height="100%"
            language="yaml"
            theme="vs"
            value={yamlText}
            options={{
              // All options for construction of monaco editor:
              // https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.ieditorconstructionoptions.html
              automaticLayout: true,
              lineNumbersMinChars: 4,
              // minimap: { enabled: false, },
              // mouseWheelZoom: true,
              renderLineHighlight: "all", // "none" | "gutter" | "line" | "all"
              renderWhitespace: "all", // "none" | "boundary" | "all"
              scrollbar: {
                horizontalScrollbarSize: 10,
                horizontalSliderSize: 6,
                verticalScrollbarSize: 10,
                verticalSliderSize: 6
              },
              showFoldingControls: 'always',
            }}
            onChange={() => this.handleChangeYaml()}
            editorDidMount={(editor, monaco) => {
              editor.getModel().updateOptions({ tabSize: 2 });
            }}
          />
        </Card.Body>

        {/* card footer */}
        <Card.Footer
          style={
            (this.props.isShowing) ? { height: "40px", padding: "0.5rem 1rem", background: "whitesmoke" } : { display: "none" }
          }
        >

          {/* error message */}
          <div
            className="d-inline-block text-truncate"
            style={{
              // fontFamily: "Menlo, Monaco, \"Courier New\", monospace",
              fontSize: "14px",
              color: "#990000",
              width: "calc(100% - 60px)",
              cursor: "help"
            }}
            title={this.state.errStack}
          >
            {this.state.errMsg}
          </div>

          {/* apply button */}
          <Button
            className="d-inline-block float-right"
            size="sm"
            style={{ borderColor: "#006699", background: "#006699", padding: "0rem 0.5rem" }}
            onClick={() => this.handleApplyYaml()}
            disabled={!this.state.isValidYaml}
          >
            Apply
          </Button>
        </Card.Footer>
      </Card>
    );
  }
}

//      OOOOOOOOO                              tttt                                                      tttt          
//    OO:::::::::OO                         ttt:::t                                                   ttt:::t          
//  OO:::::::::::::OO                       t:::::t                                                   t:::::t          
// O:::::::OOO:::::::O                      t:::::t                                                   t:::::t          
// O::::::O   O::::::Ouuuuuu    uuuuuuttttttt:::::ttttttt   ppppp   ppppppppp   uuuuuu    uuuuuuttttttt:::::ttttttt    
// O:::::O     O:::::Ou::::u    u::::ut:::::::::::::::::t   p::::ppp:::::::::p  u::::u    u::::ut:::::::::::::::::t    
// O:::::O     O:::::Ou::::u    u::::ut:::::::::::::::::t   p:::::::::::::::::p u::::u    u::::ut:::::::::::::::::t    
// O:::::O     O:::::Ou::::u    u::::utttttt:::::::tttttt   pp::::::ppppp::::::pu::::u    u::::utttttt:::::::tttttt    
// O:::::O     O:::::Ou::::u    u::::u      t:::::t          p:::::p     p:::::pu::::u    u::::u      t:::::t          
// O:::::O     O:::::Ou::::u    u::::u      t:::::t          p:::::p     p:::::pu::::u    u::::u      t:::::t          
// O:::::O     O:::::Ou::::u    u::::u      t:::::t          p:::::p     p:::::pu::::u    u::::u      t:::::t          
// O::::::O   O::::::Ou:::::uuuu:::::u      t:::::t    ttttttp:::::p    p::::::pu:::::uuuu:::::u      t:::::t    tttttt
// O:::::::OOO:::::::Ou:::::::::::::::uu    t::::::tttt:::::tp:::::ppppp:::::::pu:::::::::::::::uu    t::::::tttt:::::t
//  OO:::::::::::::OO  u:::::::::::::::u    tt::::::::::::::tp::::::::::::::::p  u:::::::::::::::u    tt::::::::::::::t
//    OO:::::::::OO     uu::::::::uu:::u      tt:::::::::::ttp::::::::::::::pp    uu::::::::uu:::u      tt:::::::::::tt
//      OOOOOOOOO         uuuuuuuu  uuuu        ttttttttttt  p::::::pppppppp        uuuuuuuu  uuuu        ttttttttttt  
//                                                           p:::::p                                                   
//                                                           p:::::p                                                   
//                                                          p:::::::p                                                  
//                                                          p:::::::p                                                  
//                                                          p:::::::p                                                  
//                                                          ppppppppp                                                  

class Output extends React.Component {
  constructor(props) {
    super(props);

    // init global variables
    window.Output = this;

    // init state
    this.state = {

      // appearance
      showSpinner: false,

      // data
      valueCol: null,
      valueRow: null,
      value: null,
      itemID: null,
      itemName: null,
      itemCol: null,
      itemRow: null,
      propertyID: null,
      qualifiers: null,
      cache: {}, // cache for Wikidata queries

      // download
      showDownload: false,
      isDownloadDisabled: true,
      downloadFileName: window.pid,
      downloadFileType: "json",
      isDownloading: false,
    };
  }

  handleDoDownload(event) {
    const filename = this.state.downloadFileName + "." + this.state.downloadFileType;

    // before sending request
    this.setState({ isDownloading: true, showDownload: false });

    // send request
    console.log("<Output> -> %c/download%c for file: %c" + filename, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("pid", window.pid);
    formData.append("type", this.state.downloadFileType);
    fetch(window.server + "/download", {
      mode: "cors",
      body: formData,
      method: "POST"
    }).then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response;
    }).then((response) => {
      return response.json();
    }).then((json) => {
      console.log("<Output> <- %c/download%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      const { error } = json;

      // if failure
      if (error !== null) {
        throw Error(error);
      }

      // else, success
      const { data } = json;
      Downloader(data, filename);

      // follow-ups (success)
      this.setState({ isDownloading: false });

    }).catch((error) => {
      console.log(error);

      // follow-ups (failure)
      this.setState({ isDownloading: false });
    });
  }

  removeBorders() {
    // remove value border
    let col = this.state.currCol;
    let row = this.state.currRow;
    if (col !== undefined && row !== undefined) {
      window.TableViewer.updateStyleByCell(col, row, { "border": "" });
    }

    // remove item border
    col = this.state.itemCol;
    row = this.state.itemRow;
    if (col !== undefined && row !== undefined) {
      window.TableViewer.updateStyleByCell(col, row, { "border": "" });
    }

    // remove qualifier borders
    let qualifiers = this.state.qualifiers;
    if (qualifiers !== undefined && qualifiers != null) {
      for (let i = 0, len = qualifiers.length; i < len; i++) {
        col = qualifiers[i]["col"];
        row = qualifiers[i]["row"];
        window.TableViewer.updateStyleByCell(col, row, { "border": "" });
      }
    }
  }

  updateOutput(colName, rowName, json) {
    if (json["statement"] === undefined) return;

    // remove current status
    this.removeOutput();

    this.setState({
      valueCol: colName,
      valueRow: rowName
    });

    // retrieve cache
    let { cache } = this.state;
    let isAllCached = true;

    // item
    const itemID = json["statement"]["item"];
    // const itemName = window.TableViewer.state.rowData[row][col];
    if (cache[itemID] !== undefined) {
      this.setState({ itemID: itemID, itemName: cache[itemID] });
    } else {
      this.setState({ itemID: itemID, itemName: "N/A" });
      this.queryWikidata(itemID, "itemName");
      isAllCached = false;
    }
    let [col, row] = json["statement"]["cell"].match(/[a-z]+|[^a-z]+/gi);
    window.TableViewer.updateStyleByCell(col, row, { "border": "1px solid black !important" });
    this.setState({ itemCol: col, itemRow: row });

    // property
    const propertyID = json["statement"]["property"];
    if (cache[propertyID] !== undefined) {
      this.setState({ propertyID: propertyID, propertyName: cache[propertyID] });
    } else {
      this.setState({ propertyID: propertyID });
      this.queryWikidata(propertyID, "propertyName");
      isAllCached = false;
    }

    // value
    const value = json["statement"]["value"];
    this.setState({ value: value });
    window.TableViewer.updateStyleByCell(colName, rowName, { "border": "1px solid hsl(150, 50%, 40%) !important" });
    this.setState({ currCol: colName, currRow: rowName });

    // qualifiers
    let temp = json["statement"]["qualifier"];
    let qualifiers = [];
    if (temp !== undefined) {
      for (let i = 0, len = temp.length; i < len; i++) {
        let qualifier = {};

        qualifier["propertyID"] = temp[i]["property"];
        if (cache[qualifier["propertyID"]] !== undefined) {
          qualifier["propertyName"] = cache[qualifier["propertyID"]];
        } else {
          this.queryWikidata(qualifier["propertyID"], "qualifiers", i, "propertyName");
          isAllCached = false;
        }

        qualifier["valueName"] = temp[i]["value"];
        if (/^[PQ]\d+$/.test(qualifier["valueName"])) {
          if (cache[qualifier["valueName"]] !== undefined) {
            qualifier["valueID"] = qualifier["valueName"];
            qualifier["valueName"] = cache[qualifier["valueName"]];
          } else {
            this.queryWikidata(qualifier["valueName"], "qualifiers", i, "valueName");
            isAllCached = false;
          }
        }

        if (temp[i]["cell"] !== undefined) {
          [col, row] = temp[i]["cell"].match(/[a-z]+|[^a-z]+/gi);
          qualifier["col"] = col;
          qualifier["row"] = row;
          // let hue = utils.getHueByRandom(10); // first param is the total number of colors
          let hue = utils.getHueByQnode(10, qualifier["propertyID"]);
          window.TableViewer.updateStyleByCell(col, row, { "border": "1px solid hsl(" + hue + ", 100%, 40%) !important" });
        }

        qualifiers.push(qualifier);
      }
    }
    this.setState({ qualifiers: qualifiers });

    if (isAllCached) {
      this.setState({ showSpinner: false });
    }
  }

  removeOutput() {
    this.removeBorders();
    this.setState({
      valueCol: null,
      valueRow: null,
      value: null,
      itemID: null,
      itemName: null,
      itemCol: null,
      itemRow: null,
      propertyID: null,
      qualifiers: null,
    });
  }

  queryWikidata(node, field, index = 0, subfield = "propertyName") {
    // FUTURE: use <local stroage> to store previous query result even longer
    const api = window.sparqlEndpoint + "?format=json&query=SELECT%20DISTINCT%20%2a%20WHERE%20%7B%0A%20%20wd%3A" + node + "%20rdfs%3Alabel%20%3Flabel%20.%20%0A%20%20FILTER%20%28langMatches%28%20lang%28%3Flabel%29%2C%20%22EN%22%20%29%20%29%20%20%0A%7D%0ALIMIT%201";
    // console.log("<Output> made query to Wikidata: " + api);

    this.setState({ showSpinner: true });
    fetch(api)
      .then(response => response.json())
      .then(json => {
        try {
          const name = json["results"]["bindings"][0]["label"]["value"];
          if (field === "itemName") {
            this.setState({ itemName: name });
          } else if (field === "propertyName") {
            this.setState({ propertyName: name });
          } else if (field === "qualifiers") {
            let qualifiers = this.state.qualifiers;
            if (subfield === "propertyName") {
              qualifiers[index]["propertyName"] = name;
            } else if (subfield === "valueName") {
              qualifiers[index]["valueID"] = qualifiers[index]["valueName"];
              qualifiers[index]["valueName"] = name;
            }
            this.setState({ qualifiers: qualifiers });
          }
          let cache = this.state.cache;
          cache[node] = name;
          this.setState({ cache: cache, showSpinner: false });
        } catch (error) {
          // console.log(error)
          this.setState({ showSpinner: false });
        }
      });
  }

  renderDownload() {
    return (
      <Modal show={this.state.showDownload} onHide={() => { /* do nothing */ }}>

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
                  <option value="ttl">.ttl</option>
                </Form.Control>
              </Col>
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* footer */}
        <Modal.Footer style={{ background: "whitesmoke" }}>
          <Button variant="outline-dark" onClick={() => this.setState({ showDownload: false })}>
            Cancel
          </Button>
          <OverlayTrigger placement="bottom" trigger="hover"
            // defaultShow="true"
            overlay={
              <Tooltip style={{ width: "fit-content" }}>
                <div className="text-left small">
                  Your file will be prepared shortly. Once the file is ready, it will be downloaded automatically.
                </div>
              </Tooltip>
            }
          >
            <Button variant="dark" onClick={this.handleDoDownload.bind(this)}>
              Start
            </Button>
          </OverlayTrigger>

        </Modal.Footer>
      </Modal >
    );
  }

  renderOutput() {
    let outputDiv = [];
    let itemName = this.state.itemName;
    if (itemName) {

      // item
      let itemID = this.state.itemID;
      let itemIDDiv = (
        <a
          href={"https://www.wikidata.org/wiki/" + itemID}
          target="_blank"
          rel="noopener noreferrer"
          style={{ "color": "hsl(200, 100%, 30%)" }}
        >{itemID}</a>
      );

      // property
      let propertyDiv;
      let propertyID = this.state.propertyID;
      let propertyName = this.state.propertyName;
      if (propertyName) {
        propertyDiv =
          <span key="property">
            <a
              href={"https://www.wikidata.org/wiki/Property:" + propertyID}
              target="_blank"
              rel="noopener noreferrer"
              style={{ "color": "hsl(200, 100%, 30%)" }}
            >{propertyName}</a>
          </span>
          ;
      } else {
        propertyDiv =
          <span key="property">
            <a
              href={"https://www.wikidata.org/wiki/Property:" + propertyID}
              target="_blank"
              rel="noopener noreferrer"
              style={{ "color": "hsl(200, 100%, 30%)" }}
            >{propertyID}</a>
          </span>
          ;
      }

      // value
      let valueDiv = this.state.value;

      // qualifiers
      let qualifiersDiv = [];
      let qualifiers = this.state.qualifiers;
      if (qualifiers) {
        for (let i = 0, len = qualifiers.length; i < len; i++) {
          let qualifier = qualifiers[i];

          // qualifier property
          let qualifierPropertyDiv;
          let qualifierPropertyID = qualifier["propertyID"];
          let qualifierPropertyName = qualifier["propertyName"];
          if (qualifierPropertyName) {
            qualifierPropertyDiv =
              <a
                href={"https://www.wikidata.org/wiki/Property:" + qualifierPropertyID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierProperty"
              >{qualifierPropertyName}</a>
              ;
          } else {
            qualifierPropertyDiv =
              <a
                href={"https://www.wikidata.org/wiki/Property:" + qualifierPropertyID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierProperty"
              >{qualifierPropertyID}</a>
              ;
          }

          // qualifier value
          let qualifierValueDiv;
          let qualifierValueID = qualifier["valueID"];
          let qualifierValueName = qualifier["valueName"];
          if (qualifierValueID) {
            qualifierValueDiv =
              <a
                href={"https://www.wikidata.org/wiki/" + qualifierValueID}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "color": "hsl(200, 100%, 30%)" }}
                key="qualifierValue"
              >{qualifierValueName}</a>
              ;
          } else {
            qualifierValueDiv = qualifierValueName;
          }

          // append to qualifiersDiv
          qualifiersDiv.push(
            <div key={i}>- {qualifierPropertyDiv}: {qualifierValueDiv}</div>
          );
        }
      }

      // final output
      outputDiv.push(
        <Card.Title key="item">
          <span style={{ fontSize: "24px", fontWeight: "bolder" }}>
            {itemName}
          </span>
          &nbsp;
          <span style={{ fontSize: "20px" }}>
            ({itemIDDiv})
          </span>
        </Card.Title>
      );
      outputDiv.push(
        <table className="w-100" key="outputTable" style={{ borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderTop: "1px solid lightgray", borderBottom: "1px solid lightgray" }}>
              <td className="p-2" style={{ fontSize: "16px", fontWeight: "bold", verticalAlign: "top", width: "40%" }}>
                {propertyDiv}
              </td>
              <td className="p-2">
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  {valueDiv}
                </div>
                <div style={{ fontSize: "14px" }}>
                  {qualifiersDiv}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
    return outputDiv;
  }

  render() {
    return (
      <div className="w-100 h-100 p-1">
        {this.renderDownload()}

        <Card className="w-100 h-100 shadow-sm">

          {/* card header */}
          <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: "#990000" }}>

            {/* title */}
            <div
              className="text-white font-weight-bold d-inline-block text-truncate"
              style={{ width: "calc(100% - 90px)", cursor: "default" }}
            >Output</div>

            {/* button to download */}
            <Button
              className="d-inline-block float-right"
              variant="outline-light"
              size="sm"
              style={{ padding: "0rem 0.5rem", width: "83px" }}
              onClick={() => this.setState({ showDownload: true, downloadFileType: "json" })}
              disabled={this.state.isDownloadDisabled || this.state.isDownloading}
            >
              {this.state.isDownloading ? <Spinner as="span" animation="border" size="sm" /> : "Download"}
            </Button>
          </Card.Header>

          {/* card body */}
          <Card.Body className="w-100 h-100 p-0" style={{ overflow: "auto" }}>

            {/* loading spinner */}
            <div className="mySpinner" hidden={!this.state.showSpinner}>
              <Spinner animation="border" />
            </div>

            {/* output */}
            <div className="w-100 p-3" style={{ height: "1px" }}>
              {this.renderOutput()}
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }
}

export default App;
