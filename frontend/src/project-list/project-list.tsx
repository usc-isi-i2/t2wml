import React, { Component, Fragment } from 'react';
import './project-list.css';
import * as utils from '../common/utils'
import Navbar from '../common/navbar/navbar'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt, faCloudDownloadAlt, faSearch, faSortUp, faSortDown, faTrashAlt } from '@fortawesome/free-solid-svg-icons'

// App
import { Button, Card, FormControl, InputGroup, OverlayTrigger, Spinner, Table, Tooltip } from 'react-bootstrap';
import { logout } from '../common/session';

import DeleteProject from './delete-project';
import RenameProject from './rename-project';
import DownloadProject from './dowmload-project';
import CreateProject from './create-project';
import ToastMessage from '../common/toast';

// console.log
import { LOG, ErrorMessage } from '../common/general';
import RequestService from '../common/service';

interface ProjectListProperties {

}

interface ProjectListState {
  showSpinner: boolean;
  showCreateProject: boolean;
  showDeleteProject: boolean;
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

class ProjectList extends Component<ProjectListProperties, ProjectListState> {
  private requestService: RequestService;
  constructor(props: ProjectListProperties) {
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
      showCreateProject: false,
      showDeleteProject: false,
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
      // projectData: [
      //   { pid: "4444", ptitle: "Project 4", cdate: 1566282771986, mdate: 1566282771986 },
      //   { pid: "1111", ptitle: "Project 1", cdate: 1565807259582, mdate: 1565807259582 },
      //   { pid: "2222", ptitle: "Project 2", cdate: 1565720859582, mdate: 1565720859582 },
      //   { pid: "3333", ptitle: "Project 3", cdate: 1563906459582, mdate: 1563906459582 },
      // ],
      sortBy: "mdate",
      isAscending: false,
      errorMessage: {} as ErrorMessage,

    };

  }

  async componentDidMount() {
    document.title = "T2WML - Projects";
    // fetch user data from the server
    try {
      const userData = await this.requestService.getUserInfo();
      this.setState( { userData: userData });
    } catch(error) {
      // User is not logged in
      window.location.href = '/';
      return;
    }

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
    //   this.handleLogout();
    });
  }

  handleCreateProject(name: string) {
    this.setState({ errorMessage: {} as ErrorMessage });
    let ptitle = name.trim();
    if (ptitle === "") ptitle = "Untitled project";

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    console.log("<App> -> %c/create_project%c to create project: %c" + ptitle, LOG.link, LOG.default, LOG.highlight);
    let formData = new FormData();
    formData.append("ptitle", ptitle);
    this.requestService.createProject(formData).then(json => {
      console.log("<App> <- %c/create_project%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json["pid"]) {
        // success
        window.location.href = "/project/" + json["pid"];
      } else {
        // failure
        throw Error("Session doesn't exist or invalid request");
      }

      // follow-ups (success)
      this.setState({ showCreateProject: false, showSpinner: false });

    }).catch((error: ErrorMessage) => {
      error.errorDescription += "\n\nCannot create new project!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      this.setState({ showCreateProject: false, showSpinner: false });
    });
  }

  cancelCreateProject() {
    this.setState({ showCreateProject: false });
  }

  handleDeleteProject(pid = "") {
    this.setState({ errorMessage: {} as ErrorMessage });
    if (pid === "") {
      pid = this.state.deletingPid;
      if (pid === "") return;
    }

    // before sending request
    this.setState({ showSpinner: true, showDeleteProject: false });

    // send request
    console.log("<App> -> %c/delete_project%c to delete project with pid: %c" + pid, LOG.link, LOG.default, LOG.highlight);
    this.requestService.deleteProject(pid as string).then(json => {
      console.log("<App> <- %c/delete_project%c with:", LOG.link, LOG.default);
      console.log(json);

      // do something here
      if (json !== null) {
        // success
        if (json['error'] !== null){
          console.log(json['error'])
        }
        else {
          const {sortBy, isAscending} = this.state;
          this.handleSortProjects(sortBy, isAscending, json['projects']);
        }
      } else {
        // failure
        throw Error("Session doesn't exist or invalid request")
      }

      // follow-ups (success)
      this.setState({ showSpinner: false });

    }).catch((error: ErrorMessage) => {
      // console.log(error);
      error.errorDescription += "\n\nCannot delete project!";
      this.setState({ errorMessage: error });
    //   alert("Cannot delete project!\n\n" + error.errorTitle);

      // follow-ups (failure)
      this.setState({ showSpinner: false });
    });
  }

  cancelDeleteProject() {
    this.setState({ showDeleteProject: false, deletingPid: "" });
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

  handleLogout() {
    logout();
  }

  handleRenameProject(name: string) {
    this.setState({ errorMessage: {} as ErrorMessage });
    let pid = this.state.tempRenamePid;
    let ptitle = name.trim();
    if (ptitle === "") ptitle = "Untitled project";

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    console.log("<App> -> %c/rename_project%c to rename project %c" + pid + "%c as %c" + ptitle, LOG.link, LOG.default, LOG.highlight, LOG.default, LOG.highlight);
    let formData = new FormData();
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

  renderProjects() {
    const { projectData, tempSearch } = this.state;
    const keywords = tempSearch.toLowerCase().split(/ +/);

    let projectListDiv = [];
    for (let i = 0, len = projectData.length; i < len; i++) {
      const { pid, ptitle, cdate, mdate } = projectData[i];
      if (utils.searchProject(ptitle, keywords)) {
        projectListDiv.push(
          <tr key={i}>

            {/* title */}
            <td>
              <span>
                <a
                  href={"/project/" + pid}
                  target="_self" // open project on this page
                  // target="_blank" // open project on new page
                  // rel="noopener noreferrer" // open project on new page
                  style={{ "color": "hsl(200, 100%, 30%)" }}
                >{ptitle}</a>
              </span>
              {/* <span className="text-muted small">&nbsp;[{pid}]</span> */}
            </td>

            {/* last modified */}
            <td>
              <OverlayTrigger placement="top" trigger={["hover", "focus"]} // defaultShow="true"
                popperConfig={{ modifiers: { hide: { enabled: false }, preventOverflow: { enabled: false } } }}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="last-modified">
                    <span className="text-left small">
                      {utils.timestamp2abstime(mdate)}
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
                      {utils.timestamp2abstime(cdate)}
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

              {/* delete */}
              <OverlayTrigger
                placement="top"
                trigger={["hover", "focus"]}
                popperConfig={{ modifiers: { hide: { enabled: false }, preventOverflow: { enabled: false } } }}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="delete">
                    <span className="text-left small">Delete</span>
                  </Tooltip>
                }
              >
                <span
                  className="action-delete"
                  style={{ display: "inline-block", width: "33%", cursor: "pointer", textAlign: "center" }}
                  onClick={() => this.setState({ showDeleteProject: true, deletingPid: pid })}
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
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
            <th style={{ width: "50%" }}>
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

            {/* last modified */}
            <th style={{ width: "20%" }}>
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
            <th style={{ width: "20%" }}>
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
        <DeleteProject 
          showDeleteProject={this.state.showDeleteProject} 
          handleDeleteProject={() => this.handleDeleteProject()}
          cancelDeleteProject={() => this.cancelDeleteProject()}
        />
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
        <CreateProject
          showCreateProject={this.state.showCreateProject}
          showSpinner={this.state.showSpinner}
          // tempCreateProject={this.state.tempCreateProject}
          // isTempCreateProjectVaild={this.state.isTempCreateProjectVaild}
          handleCreateProject={(name) => this.handleCreateProject(name)}
          cancelCreateProject={() =>this.cancelCreateProject()}
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

        <Navbar userData={this.state.userData}
        handleLogout={() => this.handleLogout()} />
        

        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: "#f8f9fa", paddingTop: "20px" }}>
          {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage}/> : null }
          <Card className="shadow-sm" style={{ width: "90%", maxWidth: "800px", height: "calc(100vh - 90px)", margin: "0 auto" }}>
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
                    style={{ fontWeight: 600 }}
                    onClick={() => {
                      this.setState({
                        // tempCreateProject: "Untitled project",
                        // isTempCreateProjectVaild: true,
                        showCreateProject: true
                      });
                    }}
                  >
                    New project
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
