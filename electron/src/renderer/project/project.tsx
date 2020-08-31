import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import Navbar from '../common/navbar/navbar';


// App
import SplitPane from 'react-split-pane';
import { Spinner } from 'react-bootstrap';


import Config from '@/shared/config';

// console.log
import { LOG, ErrorMessage } from '../common/general';

// components
import Editors from './editor';
import Output from './output/output';
import TableViewer from './table-viewer/table-viewer';
import RequestService from '../common/service';
import ToastMessage from '../common/toast';

import { observer } from "mobx-react";
import wikiStore from '../data/store';
import Settings from './settings';

interface ProjectState {
  showSettings: boolean;
  endpoint: string;
  warnEmpty: boolean;

  showSpinner: boolean;
  projectData: any; //todo: add project class[]
  errorMessage: ErrorMessage;
}

interface ProjectProps {
  id: string;
}

@observer
class Project extends Component<ProjectProps, ProjectState> {
  private requestService: RequestService;

  constructor(props: ProjectProps) {
    super(props);
    this.requestService = new RequestService();

    // init global variables
    wikiStore.table.isCellSelectable = false;
    wikiStore.settings.sparqlEndpoint = Config.defaultSparqlEndpoint;

    // init state
    this.state = {

      // appearance
      showSettings: false,
      endpoint: '',
      warnEmpty: false,

      showSpinner: false,

      // project list
      projectData: [],
      // projectData: [
      //   { pid: "4444", ptitle: "Project 4", cdate: 1566282771986, mdate: 1566282771986 },
      //   { pid: "1111", ptitle: "Project 1", cdate: 1565807259582, mdate: 1565807259582 },
      //   { pid: "2222", ptitle: "Project 2", cdate: 1565720859582, mdate: 1565720859582 },
      //   { pid: "3333", ptitle: "Project 3", cdate: 1563906459582, mdate: 1563906459582 },
      // ],

      errorMessage: {} as ErrorMessage,
    };
  }

  componentDidMount() {
    this.loadProject();
  }

  componentDidUpdate(prevProps: ProjectProps) {
    if (this.props.id !== prevProps.id) {
      this.loadProject();
    }
  }

  loadProject() {
    // before fetching project files
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // fetch project files
    console.log("<App> -> %c/get_project_files%c for previous files", LOG.link, LOG.default);
    this.requestService.getProjectFiles(this.props.id).then(json => {
      console.log("<App> <- %c/get_project_files%c with:", LOG.link, LOG.default);
      console.log(json);
      document.title = json.name;


      // do something here
      const { tableData, yamlData, wikifierData, settings } = json;

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
      if (settings) {
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

  onShowSettingsClicked() {
    this.requestService.getSettings(this.props.id)
      .then((data) => {
        this.setState({
          endpoint: data.endpoint,
          warnEmpty: data.warnEmpty,
          showSettings: true
        });
      });

  }

  handleSaveSettings() {
    console.log("<App> updated settings");

    // update settings
    this.setState({ showSettings: false });

    // notify backend
    console.log("<App> -> %c/update_settings%c", LOG.link, LOG.default);
    const formData = new FormData();
    formData.append("endpoint", wikiStore.settings.sparqlEndpoint);
    formData.append("warnEmpty", wikiStore.settings.warnEmpty.toString());
    this.requestService.updateSettings(this.props.id, formData).catch((error: ErrorMessage) => {
      console.log(error);
      error.errorDescription += "\n\nCannot update settings!";
      this.setState({ errorMessage: error });
    });
  }

  cancelSaveSettings() {
    this.setState({ showSettings: false });
  }


  render() {
    const { showSpinner } = this.state;
    return (
      <div>
        <Navbar
          showSettings={true}
          onShowSettingsClicked={() => this.onShowSettingsClicked()} />

        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}

        {/* loading spinner */}
        <div className="mySpinner" hidden={!showSpinner} style={{ height: "100%" }}>
          <Spinner animation="border" />
        </div>

        <Settings showSettings={this.state.showSettings}
          endpoint={this.state.endpoint}
          warnEmpty={this.state.warnEmpty}
          handleSaveSettings={() => this.handleSaveSettings()}
          cancelSaveSettings={() => this.cancelSaveSettings()} />

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
