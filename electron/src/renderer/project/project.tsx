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
import { ipcRenderer } from 'electron';

interface ProjectState {
  showSettings: boolean;
  endpoint: string;
  warnEmpty: boolean;
  name: string;

  showSpinner: boolean;
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
      name: '',

      showSpinner: false,

      errorMessage: {} as ErrorMessage,
    };
  }

  componentDidMount() {
    console.log("componentDidMount, props.id,",  this.props.id)

    if (this.props.id) {
      this.loadProject();
    } else {
      console.error("There is no project id.")
    }
    ipcRenderer.on('refresh-project', () => this.onRefreshProject());
    ipcRenderer.on('project-settings', () => this.onShowSettingsClicked());
  }

  componentDidUpdate(prevProps: ProjectProps) {
    console.log("componentDidUpdate, props.id, prev id==", this.props.id, prevProps.id)
    if (this.props.id !== prevProps.id) {
      this.loadProject();
    }
  }

  loadProject() {
    // before fetching project files
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;

    // fetch project files
    console.log("load project", this.props.id)
    console.log("<App> -> %c/get_project_files%c for previous files", LOG.link, LOG.default);
    this.requestService.getProjectFiles(this.props.id).then(json => {
      console.log("<App> <- %c/get_project_files%c with:", LOG.link, LOG.default);
      console.log(json);
      document.title = 't2wml: ' + json.name;
      this.setState({name: json.name});

      // do something here
      const { tableData, yamlData, wikifierData, settings } = json;

      // load table data
      wikiStore.table.updateTableData(tableData);

      // load wikifier data
      if (wikifierData !== null) {
        wikiStore.table.updateQnodeCells(wikifierData.qnodes, wikifierData.rowData);
      } else {
        wikiStore.table.updateQnodeCells(); // reset
      }

      // load yaml data
      wikiStore.yaml.updateYamlText(yamlData?.yamlFileContent);
      wikiStore.table.updateYamlRegions(yamlData?.yamlRegions);
      if (yamlData !== null) {
        wikiStore.table.isCellSelectable = true;
        wikiStore.output.isDownloadDisabled = false;
      } else {
        wikiStore.table.isCellSelectable = false;
      }

      // load settings
      if (settings) {
        wikiStore.settings.sparqlEndpoint = settings.endpoint;
      } else {
        wikiStore.settings.sparqlEndpoint = Config.defaultSparqlEndpoint;
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

  onRefreshProject() {
    this.loadProject();
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
          name={this.state.name}
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
