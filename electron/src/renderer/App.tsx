import React, { Component } from 'react';
import './App.css';
import ProjectList from './project-list/project-list';
import Project from './project/project';
import { observer } from 'mobx-react';
import wikiStore from './data/store';
import RequestService, { IStateWithError } from './common/service';
import { ipcRenderer, remote } from 'electron';
import { ErrorMessage, LOG } from './common/general';
import ToastMessage from './common/toast';
import { Spinner } from 'react-bootstrap';
import { IpcRendererEvent } from 'electron/renderer';
import * as path from 'path';
import * as fs from 'fs';


interface AppState extends IStateWithError {
  showSpinner: boolean;
}

@observer
class App extends Component<{}, AppState> {
  private requestService: RequestService;
  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    this.state = {
      showSpinner: false,
      errorMessage: {} as ErrorMessage
    }
  }

  componentDidMount() {
    ipcRenderer.on('open-project', (sender: IpcRendererEvent, folder: string) => {
      this.onOpenProject(folder);
    });
    ipcRenderer.on('new-project', (sender: IpcRendererEvent, folder: string) => {
      this.onNewProject(folder);
    });
    ipcRenderer.on('toggle-cleaned', (sender: IpcRendererEvent, checked: boolean) => {
      this.onToggleCleaned(checked);
    });

    this.checkCommandLineArgs();

  }

  checkCommandLineArgs() {

    const commandArgs = remote.getGlobal('sharedObj').prop1;
    console.log("command args", commandArgs);

    const lastArg = commandArgs[commandArgs.length - 1];
    const projectDir = path.resolve(lastArg);
    if (fs.existsSync(projectDir) && fs.lstatSync(projectDir).isDirectory()) {
      console.log("Launched with project directory:", projectDir)
      const projectFile = path.join(projectDir, "project.t2wml");
      if (fs.existsSync(projectFile)) { //existing project
        this.onOpenProject(projectDir)
        return;
      }
      else {
        this.onNewProject(projectDir)
        return;
      }
    }
    console.log("no project directory argument detected")
    wikiStore.changeProject();
  }

  onToggleCleaned(checked: boolean) {
    wikiStore.table.showCleanedData = checked;
  }

  async onNewProject(folder: string) {
    console.log('Creating project in folder ', folder);
    await this.handleNewProject(folder);
  }

  async onOpenProject(folder: string) {
    console.log('Opening project from folder ', folder);
    await this.handleOpenProject(folder);
  }

  async handleNewProject(folder: string) {
    // before sending request
    this.setState({ showSpinner: true });

    // send request
    try {
      await this.requestService.call(this, () => this.requestService.createProject(folder));
      console.log("<App> <- %c/create_project%c with:", LOG.link, LOG.default);
    } catch (error) {
      console.log(error);
    } finally {
      //after request
      this.setState({ showSpinner: false });
    }


  }

  async handleOpenProject(folder: string) {

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    try {
      await this.requestService.call(this, () => this.requestService.getProject(folder));
      wikiStore.changeProject(folder);
    } catch (error) {
      console.log(error);
    } finally {
      //after request
      this.setState({ showSpinner: false });
    }


  }

  render() {
    return (
      <div>
        { this.state.errorMessage.errorDescription ? <ToastMessage message={this.state.errorMessage} /> : null}

        {/* loading spinner */}
        <div className="mySpinner" hidden={!this.state.showSpinner} style={{ height: "100%" }}>
          <Spinner animation="border" />
        </div>

        { wikiStore.displayMode === "project-list" ? <ProjectList /> : <Project path={wikiStore.projects.current!.folder} />}
      </div>
    );
  }
}

export default App;
