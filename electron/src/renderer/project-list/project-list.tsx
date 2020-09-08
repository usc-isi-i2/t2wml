import React, { Component, Fragment } from 'react';
import { ipcRenderer } from 'electron';

import './project-list.css';
import * as utils from '../common/utils'
import Navbar from '../common/navbar/navbar'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt, faCloudDownloadAlt, faSearch, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons'

// App
import { Button, Card, FormControl, InputGroup, OverlayTrigger, Spinner, Table, Tooltip } from 'react-bootstrap';

import RenameProject from './rename-project';
import DownloadProject from './dowmload-project';
import ToastMessage from '../common/toast';

// console.log
import { LOG, ErrorMessage } from '../common/general';
import RequestService from '../common/service';

import { observer } from "mobx-react";
import wikiStore from '../data/store';

interface ProjectListState {
  showSpinner: boolean;
  showDownloadProject: boolean;
  showRenameProject: boolean;
  deletingPid: string;
  downloadingPid: string;

  // user
  userData: any,

  // temp in form
  tempRenamePid: string | null;
  tempRenameProject: string;
  isTempRenameProjectVaild: boolean;
  tempSearch: string;

  // projects
  projectData: any;
  sortBy: string;
  isAscending: boolean;

  errorMessage: ErrorMessage;
}

@observer
class ProjectList extends Component<{}, ProjectListState> {
  private requestService: RequestService;
  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    // this.handleRenameProject = this.handleRenameProject.bind(this);

    // fetch data from flask
    // const { userData } = this.props;

    // init global variables
    // window.sparqlEndpoint = DEFAULT_SPARQL_ENDPOINT;

    // init state
    this.state = {

      // appearance
      showSpinner: true,
      showDownloadProject: false,
      showRenameProject: false,
      deletingPid: "",
      downloadingPid: "",

      // user
      userData: {},

      // temp in form
      tempRenamePid: null,
      tempRenameProject: "",
      isTempRenameProjectVaild: true,
      tempSearch: "",

      // projects
      projectData: [],
      sortBy: "mdate",
      isAscending: false,
      errorMessage: {} as ErrorMessage,
    };
  }

  async componentDidMount() {
    document.title = "T2WML - Projects";
    // fetch project meta
    console.log("<App> -> %c/get_project_meta%c for project list", LOG.link, LOG.default);
    this.requestService.getProjects().then(json => {
      console.log("<App> <- %c/get_project_meta%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json !== null) {
        // success
          if(json['error'] !== null){
            console.log(json['error']);
          }
          else{
            this.setState({ projectData: json['projects'] });
            this.handleSortProjects("mdate", false);
          }
      } else {
        // failure
        throw Error("Session doesn't exist or invalid request");
      }

      // follow-ups (success)
      this.setState({ showSpinner: false });

    }).catch((error: ErrorMessage) => {
    //   console.log(error);
      error.errorDescription += "\n\nCannot fetch project details!";
      this.setState({ errorMessage: error });
    //   alert("Cannot fetch project details!\n\n" + error);

      // follow-ups (failure)
      this.setState({ showSpinner: false });
    });
  }


  handleDownloadProject(pid = "") {
    this.setState({ errorMessage: {} as ErrorMessage });
    if (pid === "") {
      pid = this.state.downloadingPid;
      if (pid === "") return;
    }

    // before sending request
    this.setState({ showDownloadProject: false });

    // send request
    console.log("<App> -> %c/download_project%c to download all files in project with pid: %c" + pid, LOG.link, LOG.default, LOG.highlight);
    this.requestService.downloadProject(pid).then(json => {
      console.log("<App> <- %c/download_project%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json !== null) {
        // success
        // TODO: download all files

      } else {
        // failure
        throw Error("Session doesn't exist or invalid request")
      }

      // follow-ups (success)
      this.setState({ showSpinner: false });

    }).catch((error: ErrorMessage) => {
      // console.log(error);
      error.errorDescription += "\n\nCannot download project!";
      this.setState({ errorMessage: error });
    //   alert("Cannot download project!\n\n" + error);

      // follow-ups (failure)
      // nothing
    });
  }

  cancelDownloadProject() {
    this.setState({ showDownloadProject: false, downloadingPid: "" });
  }

  handleRenameProject(name: string) {
    this.setState({ errorMessage: {} as ErrorMessage });
    const pid = this.state.tempRenamePid;
    let ptitle = name.trim();
    if (ptitle === "") ptitle = "Untitled project";

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    console.log("<App> -> %c/rename_project%c to rename project %c" + pid + "%c as %c" + ptitle, LOG.link, LOG.default, LOG.highlight, LOG.default, LOG.highlight);
    const formData = new FormData();
    formData.append("ptitle", ptitle);
    this.requestService.renameProject(pid as string, formData).then(json => {
      console.log("<App> <- %c/rename_project%c with:", LOG.link, LOG.default);
      console.log(json);
      
      // do something here
      if (json !== null) {
        // success
        if (json['error'] !== null){
          console.log(json['error'])
        }
        else{
          const { sortBy, isAscending } = this.state;
          this.handleSortProjects(sortBy, isAscending, json['projects']);
        }
      } else {
        // failure
        throw Error("Session doesn't exist or invalid request")
      }

      // follow-ups (success)
      this.setState({ showRenameProject: false, showSpinner: false });

    }).catch((error: ErrorMessage) => {
      // console.log(error);
      error.errorDescription += "\n\nCannot rename project!";
      this.setState({ errorMessage: error });
    //   alert("Cannot rename project!\n\n" + error);

      // follow-ups (failure)
      this.setState({ showRenameProject: false, showSpinner: false });
    });
  }

  cancelRenameProject() {
    this.setState({ showRenameProject: false });
  }

  handleSortProjects(willSortBy: string, willBeAscending: boolean | null = null, newProjectData = null) {
    const { sortBy, isAscending } = this.state;

    // decide if it's ascending
    if (willBeAscending === null) {
      if (willSortBy === sortBy) {
        // click same header again
        willBeAscending = !isAscending;
      } else {
        // click another header, go default
        if (willSortBy === "cdate" || willSortBy === "mdate") {
          willBeAscending = false;
        } else {
          willBeAscending = true;
        }
      }
    }

    // sort
    let projectData;
    if (newProjectData !== null) {
      projectData = newProjectData;
    } else {
      projectData = this.state.projectData;
    }
    projectData.sort(function (p1: any, p2: any) {
      if (willBeAscending) {
        if (p1[willSortBy] < p2[willSortBy]) return -1;
        else if (p1[willSortBy] > p2[willSortBy]) return 1;
        else return 0;
      } else {
        if (p1[willSortBy] < p2[willSortBy]) return 1;
        else if (p1[willSortBy] > p2[willSortBy]) return -1;
        else return 0;
      }
    });

    // update state
    this.setState({
      projectData: projectData,
      sortBy: willSortBy,
      isAscending: willBeAscending,
    });
  }

  projectClicked(pid: string, path: string) {
    wikiStore.changeProject(pid, path);
  }

  renderProjects() {
    const { projectData, tempSearch } = this.state;
    const keywords = tempSearch.toLowerCase().split(/ +/);

    const projectListDiv = [];
    for (let i = 0, len = projectData.length; i < len; i++) {
      const { pid, ptitle, directory, cdate, mdate } = projectData[i];
      if (utils.searchProject(ptitle, keywords)) {
        projectListDiv.push(
          <tr key={i}>

            {/* title */}
            <td>
              <span style={{ "color": "hsl(200, 100%, 30%)" }} onClick={() => this.projectClicked(pid, directory)}>
                  {ptitle}
              </span>
              {/* <span className="text-muted small">&nbsp;[{pid}]</span> */}
            </td>

            {/* path */}
            <td>
              <span>
                  {directory}
              </span>
            </td>

            {/* last modified */}
            <td>
              <OverlayTrigger placement="top" trigger={["hover", "focus"]} // defaultShow="true"
                popperConfig={{ modifiers: { hide: { enabled: false }, preventOverflow: { enabled: false } } }}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="last-modified">
                    <span className="text-left small">
                      {mdate}
                    </span>
                  </Tooltip>
                }
              >
                <span style={{ display: "inline-block", cursor: "default", color: "gray" }}>{utils.timestamp2reltime(mdate)}</span>
              </OverlayTrigger>
            </td>

            {/* date created */}
            <td>
              <OverlayTrigger placement="top" trigger={["hover", "focus"]} // defaultShow="true"
                popperConfig={{ modifiers: { hide: { enabled: false }, preventOverflow: { enabled: false } } }}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="date-created">
                    <span className="text-left small">
                      {cdate}
                    </span>
                  </Tooltip>
                }
              >
                <span style={{ display: "inline-block", cursor: "default", color: "gray" }}>{utils.timestamp2reltime(cdate)}</span>
              </OverlayTrigger>
            </td>

            {/* actions */}
            <td>

              {/* rename */}
              <OverlayTrigger
                placement="top"
                trigger={["hover", "focus"]}
                popperConfig={{ modifiers: { hide: { enabled: false }, preventOverflow: { enabled: false } } }}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="rename">
                    <span className="text-left small">Rename</span>
                  </Tooltip>
                }
              >
                <span
                  className="action-duplicate"
                  style={{ display: "inline-block", width: "33%", cursor: "pointer", textAlign: "center" }}
                  onClick={() => this.setState({ showRenameProject: true, tempRenamePid: pid, tempRenameProject: ptitle })}
                >
                  <FontAwesomeIcon icon={faPencilAlt} />
                </span>
              </OverlayTrigger>

              {/* download */}
              <OverlayTrigger
                placement="top"
                trigger={["hover", "focus"]}
                popperConfig={{ modifiers: { hide: { enabled: false }, preventOverflow: { enabled: false } } }}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="download">
                    <span className="text-left small">Download</span>
                  </Tooltip>
                }
              >
                <span
                  className="action-download"
                  style={{ display: "inline-block", width: "33%", cursor: "pointer", textAlign: "center" }}
                  onClick={() => this.setState({ showDownloadProject: true, downloadingPid: pid })}
                >
                  <FontAwesomeIcon icon={faCloudDownloadAlt} />
                </span>
              </OverlayTrigger>
            </td>
          </tr>
        );
      }
    }
    if (projectListDiv.length === 0) {
      projectListDiv.push(
        <tr key={-1}>
          <td colSpan={4} style={{ textAlign: "center" }}>No projects</td>
        </tr>
      );
    }
    const { sortBy, isAscending } = this.state;
    return (
      <Table bordered hover responsive size="sm" style={{ fontSize: "14px" }}>
        <thead style={{ background: "whitesmoke" }}>
          <tr>

            {/* title */}
            <th style={{ width: "30%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleSortProjects("ptitle")}
              >
                Title
              </span>
              {
                (sortBy === "ptitle") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* path */}
            <th style={{ width: "40%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleSortProjects("directory")}
              >
                Path
              </span>
              {
                (sortBy === "directory") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* last modified */}
            <th style={{ width: "10%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleSortProjects("mdate")}
              >
                Last Modified
              </span>
              {
                (sortBy === "mdate") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* date created */}
            <th style={{ width: "10%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleSortProjects("cdate")}
              >
                Date Created
              </span>
              {
                (sortBy === "cdate") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* actions */}
            <th style={{ width: "10%" }}>
              <span
                style={{ cursor: "default" }}
              >
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projectListDiv}
        </tbody>
      </Table>
    );
  }

  renderModals() {
    return (
      <Fragment>
        <DownloadProject 
          showDownloadProject={this.state.showDownloadProject} 
          handleDownloadProject={() => this.handleDownloadProject()}
          cancelDownloadProject={() => this.cancelDownloadProject()}
        />
        <RenameProject 
          showRenameProject={this.state.showRenameProject}
          showSpinner={this.state.showSpinner}
          tempRenameProject={this.state.tempRenameProject}
          isTempRenameProjectVaild={this.state.isTempRenameProjectVaild}
          handleRenameProject={(name) => this.handleRenameProject(name)}
          cancelRenameProject={() => this.cancelRenameProject()}
        />
      </Fragment>
    );
  }

  render() {
    return (
      <div>

        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.state.showSpinner}>
          <Spinner animation="border" />
        </div>

        {this.renderModals()}

        <Navbar/>
        
        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: "#f8f9fa", paddingTop: "20px" }}>
          {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }
          <Card className="shadow-sm" style={{ width: "80%", height: "calc(100vh - 90px)", margin: "0 auto" }}>
            <Card.Header style={{ height: "40px", padding: "0.5rem 1rem", background: "#343a40" }}>
              <div
                className="text-white font-weight-bold d-inline-block text-truncate"
                style={{ width: "100%", cursor: "default" }}
              >
                Projects
              </div>
            </Card.Header>
            <Card.Body style={{ padding: "20px 5%", overflowY: "auto" }}>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "inline-block", width: "40%" }}>
                <Button
                    variant="primary"
                    size="sm"
                    style={{ fontWeight: 600, marginRight: '1rem' }}
                    onClick={() => {
                      ipcRenderer.send('new-project');
                    }}
                  >
                    New project
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ fontWeight: 600 }}
                    onClick={() => {
                      ipcRenderer.send('open-project');
                    }}
                  >
                    Open project
                  </Button>
                </div>
                <div style={{ display: "inline-block", width: "60%" }}>
                  <InputGroup size="sm">
                    <InputGroup.Prepend>
                      <InputGroup.Text style={{ background: "whitesmoke" }}>
                        <FontAwesomeIcon icon={faSearch} />
                      </InputGroup.Text>
                    </InputGroup.Prepend>
                    <FormControl placeholder="Search projects..." onChange={(event) => this.setState({ tempSearch: event.target.value })} />
                  </InputGroup>
                </div>
              </div>
              {this.renderProjects()}
            </Card.Body>
          </Card>
        </div>
      </div>
    );
  }
}

export default ProjectList;
