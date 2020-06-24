import { observable } from 'mobx';

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
    @observable public updateYamlRegions: (newYamlRegions?: any) => void;
    @observable public updateQnodeCells: (qnodes?: any, rowData?: any) => void;
    @observable public updateTableData: (tableData: any) => void; // tableData as type TableData
    @observable public updateStyleByCell: (colName: string | number | null, rowName: string | number | null, style: {border: string}, override?: boolean) => void;

    constructor() {
        this.isCellSelectable = false;

        this.showSpinner = false;
        this.updateYamlRegions = () => {};
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
    @observable public updateWikifier: (qnodeData?: any, rowData?: any) => void;
    @observable public state: WikifierInnerState | undefined;
    @observable public scope: number; // Is it needed?

    constructor() {
        this.showSpinner = false;
        this.updateWikifier = () => {};
        this.state = new WikifierInnerState();
        this.scope = 0;
    }
}

class OutputState {
    @observable public showSpinner: boolean;
    @observable public isDownloadDisabled: boolean;
    @observable public removeOutput: () => void;
    @observable public updateOutput: (colName: string, rowName: string, json: any) => void;


    constructor() {
        this.showSpinner = false;
        this.isDownloadDisabled = true;
        this.removeOutput = () => {};
        this.updateOutput = () => {};
    }
}

class YamlEditorState {
    @observable public updateYamlText: (yamlText?: string | null) => void;

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
    @observable public yaml = new YamlEditorState();
}


const wikiStore = new WikiStore();
export default wikiStore;
