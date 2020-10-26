import React, { Component } from 'react';
import { ipcRenderer } from 'electron';

import './project-list.css';
import * as utils from '../common/utils'
import Navbar from '../common/navbar/navbar'

// icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt, faSearch, faSortUp, faSortDown, faTimes, faFolderOpen } from '@fortawesome/free-solid-svg-icons'

// App
import { Button, Card, FormControl, InputGroup, OverlayTrigger, Spinner, Table, Tooltip } from 'react-bootstrap';

import RenameProject from './rename-project'
import ToastMessage from '../common/toast';

// console.log
import { LOG, ErrorMessage } from '../common/general';
import RequestService, { IStateWithError } from '../common/service';

import { observer } from "mobx-react";
import wikiStore from '../data/store';
import { Project } from '../data/projects';

import { shell } from 'electron';

interface ProjectListState extends IStateWithError {
  showSpinner: boolean;
  showRenameProject: boolean;
  deletingProjectPath: string;

  // user
  userData: any,

  // temp in form
  tempRenameProjectPath: string | null;
  tempRenameProject: string;
  isTempRenameProjectVaild: boolean;
  tempSearch: string;

  // projects
  sortBy: SortByField;
  isAscending: boolean;
}

type SortByField = 'name' | 'folder' | 'created' | 'modified';

@observer
class ProjectList extends Component<{}, ProjectListState> {
  private requestService: RequestService;
  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    // init state
    this.state = {

      // appearance
      showSpinner: false,
      showRenameProject: false,
      deletingProjectPath: "",

      // user
      userData: {},

      // temp in form
      tempRenameProjectPath: null,
      tempRenameProject: "",
      isTempRenameProjectVaild: true,
      tempSearch: "",

      // projects
      sortBy: "modified",
      isAscending: false,
      errorMessage: {} as ErrorMessage,
    };
  }

  componentDidMount() {
    document.title = "T2WML - Projects";
  }

  handleDeleteProject(path: string) {
    const project = wikiStore.projects.find(path);
    if (!project) {
      console.warn(`No project for ${path} in project list`);
      return;
    }

    ipcRenderer.send('remove-project', path);
    wikiStore.projects.refreshList();
  }

  async handleRenameProject(name: string) {
    const path = this.state.tempRenameProjectPath;
    let ptitle = name.trim();
    if (ptitle === "") ptitle = "Untitled project";

    if (!path) { return; }

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    console.log("<App> -> %c/rename_project%c to rename project %c" + path + "%c as %c" + ptitle, LOG.link, LOG.default, LOG.highlight, LOG.default, LOG.highlight);
    const formData = new FormData();
    formData.append("ptitle", ptitle);
    try {
      await this.requestService.call(this, () => this.requestService.renameProject(path, formData));
      wikiStore.projects.refreshList();
    } catch { } finally {
      this.setState({ showRenameProject: false, showSpinner: false });
    }
  }

  cancelRenameProject() {
    this.setState({ showRenameProject: false });
  }

  handleApplySort(willSortBy: SortByField, willBeAscending: boolean | null = null) {
    const { sortBy, isAscending } = this.state;

    // decide if it's ascending
    if (willBeAscending === null) {
      if (willSortBy === sortBy) {
        // click same header again
        willBeAscending = !isAscending;
      } else {
        // click another header, go default
        if (willSortBy === "created" || willSortBy === "modified") {
          willBeAscending = false;
        } else {
          willBeAscending = true;
        }
      }
    }

    // update state
    this.setState({
      // projectData: projectData,
      sortBy: willSortBy,
      isAscending: willBeAscending,
    });
  }

  sortProjects(projects: Project[]) {
    // sort
    const { isAscending, sortBy } = this.state;

    const sortedProjects = [...projects];
    sortedProjects.sort(function (p1: any, p2: any) {
      if (isAscending) {
        if (p1[sortBy] < p2[sortBy]) return -1;
        else if (p1[sortBy] > p2[sortBy]) return 1;
        else return 0;
      } else {
        if (p1[sortBy] < p2[sortBy]) return 1;
        else if (p1[sortBy] > p2[sortBy]) return -1;
        else return 0;
      }
    });

    return sortedProjects;
  }

  projectClicked(path: string) {
    wikiStore.changeProject(path);
  }

  formatTime(time: Date): string {
    return time.toUTCString();
  }

  renderProjects() {
    const { tempSearch } = this.state;
    const keywords = tempSearch.toLowerCase().split(/ +/);
    const projectList = this.sortProjects(wikiStore.projects.projects);

    const projectListDiv = [];
    for (const project of projectList) {
      if (utils.searchProject(project.name, keywords)) {
        projectListDiv.push(
          <tr key={project.folder}>

            {/* title */}
            <td>
              <span style={{ "color": "hsl(200, 100%, 30%)", cursor: 'pointer' }} onClick={() => this.projectClicked(project.folder)}>
                {project.name}
              </span>
              {/* <span className="text-muted small">&nbsp;[{pid}]</span> */}
            </td>

            {/* path */}
            <td>
              <span>
                {project.folder}
              </span>
            </td>

            {/* last modified */}
            <td>
              <span className="text-left small">
                {this.formatTime(project.modified)}
              </span>
            </td>

            {/* date created */}
            <td>
              <span className="text-left small">
                {this.formatTime(project.created)}
              </span>
            </td>

            {/* actions */}
            <td>

              {/* rename */}
              <OverlayTrigger
                placement="top"
                trigger={["hover", "focus"]}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="rename">
                    <span className="text-left small">Rename</span>
                  </Tooltip>
                }
              >
                <span
                  className="action-duplicate"
                  style={{ display: "inline-block", width: "33%", cursor: "pointer", textAlign: "center" }}
                  onClick={() => this.setState({ showRenameProject: true, tempRenameProjectPath: project.folder, tempRenameProject: project.name })}
                >
                  <FontAwesomeIcon icon={faPencilAlt} />
                </span>
              </OverlayTrigger>

              {/* open in filesystem */}
              <OverlayTrigger
                placement="top"
                trigger={["hover", "focus"]}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="download">
                    <span className="text-left small">Show in filesystem</span>
                  </Tooltip>
                }
              >
                <span
                  className="action-download"
                  style={{ display: "inline-block", width: "33%", cursor: "pointer", textAlign: "center" }}
                  onClick={() => shell.showItemInFolder(project.folder)}
                >
                  <FontAwesomeIcon icon={faFolderOpen} />
                </span>
              </OverlayTrigger>

              {/* delete */}
              <OverlayTrigger
                placement="top"
                trigger={["hover", "focus"]}
                overlay={
                  <Tooltip style={{ width: "fit-content" }} id="delete">
                    <span className="text-left small">Delete</span>
                  </Tooltip>
                }
              >
                <span
                  className="action-delete"
                  style={{ display: "inline-block", width: "33%", cursor: "pointer", textAlign: "center" }}
                  onClick={() => this.handleDeleteProject(project.folder)}
                >
                  <FontAwesomeIcon icon={faTimes} />
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
            <th style={{ width: "26%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleApplySort("name")}
              >
                Title
              </span>
              {
                (sortBy === "name") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* path */}
            <th style={{ width: "40%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleApplySort("folder")}
              >
                Path
              </span>
              {
                (sortBy === "folder") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* last modified */}
            <th style={{ width: "13%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleApplySort("modified")}
              >
                Last Modified
              </span>
              {
                (sortBy === "modified") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* date created */}
            <th style={{ width: "13%" }}>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => this.handleApplySort("created")}
              >
                Date Created
              </span>
              {
                (sortBy === "created") ?
                  <span>
                    &nbsp;{(isAscending) ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />}
                  </span> : ""
              }
            </th>

            {/* actions */}
            <th style={{ width: "8%" }}>
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
      <RenameProject
        showRenameProject={this.state.showRenameProject}
        showSpinner={this.state.showSpinner}
        tempRenameProject={this.state.tempRenameProject}
        isTempRenameProjectVaild={this.state.isTempRenameProjectVaild}
        handleRenameProject={(name) => this.handleRenameProject(name)}
        cancelRenameProject={() => this.cancelRenameProject()}
      />
    );
  }

  render() {
    return (
      <div className="project-list">

        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.state.showSpinner}>
          <Spinner animation="border" />
        </div>

        {this.renderModals()}

        <Navbar />

        {/* content */}
        <div style={{ height: "calc(100vh - 50px)", background: "#f8f9fa", paddingTop: "20px" }}>
          {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}
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
