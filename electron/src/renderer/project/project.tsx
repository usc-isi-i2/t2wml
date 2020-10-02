import React, { Component } from 'react';
import './project.css';
import './ag-grid.css'
import './ag-theme-balham.css'
import Navbar from '../common/navbar/navbar';


// App
import SplitPane from 'react-split-pane';

import Config from '@/shared/config';

import { ErrorMessage } from '../common/general';

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
  errorMessage: ErrorMessage;
}

interface ProjectProps {
  path: string;
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

      errorMessage: {} as ErrorMessage,
    };

    // Bind the handlers that are tied to ipcRenderer and needs to be removed
    this.onRefreshProject = this.onRefreshProject.bind(this);
    this.onShowSettingsClicked = this.onShowSettingsClicked.bind(this);
  }

  async componentDidMount() {
    if (this.props.path) {
      await this.loadProject();
    } else {
      console.error("There is no project id.")
    }
    ipcRenderer.on('refresh-project', this.onRefreshProject);
    ipcRenderer.on('project-settings', this.onShowSettingsClicked);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('refresh-project', this.onRefreshProject);
    ipcRenderer.removeListener('project-settings', this.onShowSettingsClicked);
  }

  async componentDidUpdate(prevProps: ProjectProps) {
    if (this.props.path !== prevProps.path) {
      await this.loadProject();
    }
  }

  async loadProject() {
    // before fetching project files
    wikiStore.table.showSpinner = true;
    wikiStore.wikifier.showSpinner = true;
    wikiStore.output.isDownloadDisabled = true;

    // fetch project files
    console.debug('Refreshing project ', this.props.path);
    try{
      const json = await this.requestService.getProjectFiles(this.props.path);
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

        // Save data regions (enable get the output to these cells).
        wikiStore.table.dataRegionsCells = yamlData.yamlRegions.dataRegion.list;
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

    } catch(error) {
      console.error("Can't fetch project: ", error);
      error.errorDescription += "\n\nCannot fetch project!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      wikiStore.table.showSpinner = false;
      wikiStore.wikifier.showSpinner = false;
    }
  }

  async onRefreshProject() {
    await this.loadProject();
  }

  async onShowSettingsClicked() {
    const data = await this.requestService.getSettings(this.props.path);
    this.setState({
      endpoint: data.endpoint,
      warnEmpty: data.warnEmpty,
      showSettings: true
    });
  }

  async handleSaveSettings() {
    // update settings
    this.setState({ showSettings: false });

    // notify backend
    const formData = new FormData();
    formData.append("endpoint", wikiStore.settings.sparqlEndpoint);
    formData.append("warnEmpty", wikiStore.settings.warnEmpty.toString());

    try {
      await this.requestService.updateSettings(this.props.path, formData);
    } catch(error) {
      console.error('Error updating settings: ', error);
      error.errorDescription += "\n\nCannot update settings!";
      this.setState({ errorMessage: error });
    }
  }

  cancelSaveSettings() {
    this.setState({ showSettings: false });
  }


  render() {
    return (
      <div>
        <Navbar
          name={this.state.name}
          showSettings={true}
          onShowSettingsClicked={() => this.onShowSettingsClicked()} />

        {this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}

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
