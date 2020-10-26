import React, { Component } from 'react';
import './App.css';
import ProjectList from './project-list/project-list';
import Project from './project/project';
import { observer } from 'mobx-react';
import wikiStore from './data/store';
import RequestService from './common/service';
import { ipcRenderer } from 'electron';
import { ErrorMessage, LOG } from './common/general';
import ToastMessage from './common/toast';
import { Spinner } from 'react-bootstrap';
import { IpcRendererEvent } from 'electron/renderer';


interface AppState {
  errorMessage: ErrorMessage;
  showSpinner: boolean;
}

@observer
class App extends Component<{}, AppState> {
  private requestService: RequestService;
  constructor(props: {}) {
    super(props);
    this.requestService = new RequestService();

    this.state = {
      errorMessage: {} as ErrorMessage,
      showSpinner: false,
    }
  }

  componentDidMount() {
    ipcRenderer.on('open-project', (sender: IpcRendererEvent, folder: string) => {
      this.onOpenProject(folder);
    });
    ipcRenderer.on('new-project', (sender: IpcRendererEvent, folder: string) => {
      this.onNewProject(folder);
    });
    wikiStore.changeProject();
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
    this.setState({ errorMessage: {} as ErrorMessage });

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    try {
      const response = await this.requestService.createProject(folder);
    
      console.log("<App> <- %c/create_project%c with:", LOG.link, LOG.default);
      console.log(response);

      // do something here
      wikiStore.changeProject(folder);
      
      // follow-ups (success)
      this.setState({ showSpinner: false });

    } catch (error) {
      error.errorDescription += "\n\nCannot create project!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
      this.setState({ showSpinner: false });
    }
  }

  async handleOpenProject(folder: string) {
    this.setState({ errorMessage: {} as ErrorMessage });

    // before sending request
    this.setState({ showSpinner: true });

    // send request
    try {
      const response = await this.requestService.getProject(folder);
    
      console.log("<App> <- %c/load_project%c with:", LOG.link, LOG.default);
      console.log(response);

      wikiStore.changeProject(folder);

      // follow-ups (success)
      this.setState({ showSpinner: false });

    } catch (error) {
      error.errorDescription += "\n\nCannot load project!";
      this.setState({ errorMessage: error });

      // follow-ups (failure)
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
        
        { wikiStore.displayMode === "project-list" ? <ProjectList /> : <Project path={wikiStore.projects.current!.folder}/> }
      </div>
    );
  }
}

export default App;
