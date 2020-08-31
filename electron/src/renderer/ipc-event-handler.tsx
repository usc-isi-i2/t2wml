import React, { Component } from 'react';
import { ipcRenderer, EventEmitter } from 'electron';
import { useHistory } from 'react-router-dom';
import { LOG, ErrorMessage } from './common/general';
import RequestService from './common/service';

class IpcEventHandler extends Component<{}, {}> {
    private requestService: RequestService;

    constructor(props: {}) {
        super(props);
        this.requestService = new RequestService();
    }

    componentDidMount() {
        ipcRenderer.on('open-project', (sender: EventEmitter, folder: string) => {
            this.onOpenProject(folder);
        });
        ipcRenderer.on('new-project', (sender: EventEmitter, folder: string) => {
            this.onNewProject(folder);
        });
    }

    onNewProject(folder: string) {
        console.log('Creating project in folder ', folder);
    }


    async onOpenProject(folder: string) {
        this.setState({ errorMessage: {} as ErrorMessage });

        // before sending request
        this.setState({ showSpinner: true });

        // send request
        const formData = new FormData();
        formData.append("path", folder);
        try {
            const response = await this.requestService.loadProject(formData);

            console.log("<App> <- %c/load_project%c with:", LOG.link, LOG.default);
            console.log(response);

            // do something here
            if (response["pid"]) {
                // success
                const history = useHistory();
                history.push("/project/" + response["pid"]);
            } else {
                // failure
                throw Error("Session doesn't exist or invalid request");
            }

            // follow-ups (success)
        } catch (error) { // :ErrorDEscription
            error.errorDescription += "\n\nCannot load project";
            this.setState({ errorMessage: error });
        }
        this.setState({ showLoadProject: false, showSpinner: false });
    }

    render() {
        return (<div />);
    }
}

export default IpcEventHandler;