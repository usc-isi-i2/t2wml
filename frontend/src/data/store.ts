import { observable, computed } from 'mobx';

class ProjectState {
    @observable public pid: string;

    constructor() {
        this.pid = '';
    }
}

type EditorsStatus = "Wikifier" | "YamlEditor";
class EditorsState {
    @observable public nowShowing: EditorsStatus = "Wikifier";
}

class TabletState {
    @observable public isCellSelectable: boolean;

    @observable public showSpinner: boolean;
    @observable public updateYamlRegoins: () => void;
    @observable public updateQnodeCells: () => void;
    @observable public updateTableData: () => void;
    @observable public updateStyleByCell: () => void;

    constructor() {
        this.isCellSelectable = false;

        this.showSpinner = false;
        this.updateYamlRegoins = () => {};
        this.updateQnodeCells = () => {};
        this.updateTableData = () => {};
        this.updateStyleByCell = () => {};
    }
}

class SettingsState {
    @observable public sparqlEndpoint: string;

    constructor() {
        this.sparqlEndpoint = '';
    }
}

class WikifierInnerState {
    @observable public qnodeData: any = {};
    @observable public currRegion: string = ''; // Is it needed?
}
class WikifierState {
    @observable public showSpinner: boolean;
    @observable public updateWikifier: () => void;
    @observable public state: WikifierInnerState | undefined;
    @observable public scope: number; // Is it needed?
    // updateWikifier

    constructor() {
        this.showSpinner = false;
        // this.updateWikifier = (this: any, qnodeData = {}, rowData = []) => {
        //     // update
        //     this.setState({
        //       qnodeData: qnodeData,
        //       rowData: rowData,
        //     });
        //   }

        this.updateWikifier = () => {};
        this.state = new WikifierInnerState();
        this.scope = 0;
    }
}

class OutputState {
    @observable public showSpinner: boolean;
    @observable public isDownloadDisabled: boolean;
    @observable public removeOutput: () => void;
    @observable public updateOutput: () => void;


    constructor() {
        this.showSpinner = false;
        this.isDownloadDisabled = true;
        this.removeOutput = () => {};
        this.updateOutput = () => {};
    }
}

class YamlEditor {
    @observable public updateYamlText: () => void;

    constructor() {
        this.updateYamlText = () => {};
    }
}


class WikiStore {
    @observable public project = new ProjectState();
    @observable public editors = new EditorsState();
    @observable public table = new TabletState();
    @observable public settings = new SettingsState();
    @observable public wikifier = new WikifierState();
    @observable public output = new OutputState();
}


const wikiStore = new WikiStore();
export default wikiStore;
