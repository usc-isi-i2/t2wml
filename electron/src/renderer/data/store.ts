import { observable, action, computed } from 'mobx';
import { ipcRenderer } from 'electron';
import { DisplayMode } from '@/shared/types';
import { ProjectList } from './projects';

type EditorsStatus = "Wikifier" | "YamlEditor";
class EditorsState {
    @observable public nowShowing: EditorsStatus = "Wikifier";
}

class TableState {
    @observable public isCellSelectable: boolean;
    @observable public showSpinner: boolean;
    @observable public errorCells: string[] | undefined;
    @observable public dataRegionsCells: string[];

    @observable public yamlRegions: any;
    @observable public qnodes: any;
    @observable public rowData: any;
    @observable public tableData: any;// tableData as type TableData
    @observable public wikifierFile: any; // File

    @observable public updateStyleByCell: (colName: string | number | null, rowName: string | number | null, style: any, override?: boolean) => void;
    
    constructor() {
        this.isCellSelectable = false;

        this.showSpinner = false;
        this.errorCells = undefined;
        this.dataRegionsCells = [];

        this.yamlRegions = undefined;
        this.qnodes = undefined;
        this.rowData = undefined;
        this.tableData = undefined;
        this.wikifierFile = undefined;

        this.updateStyleByCell = () => undefined;
    }

    @action
    public updateQnodeCells(qnodes: any = {}, rowData: any = []) {
        this.qnodes = qnodes;
        this.rowData = rowData;
    }
}

class SettingsState {
    @observable public sparqlEndpoint: string;
    @observable public warnEmpty: boolean;

    constructor() {
        this.sparqlEndpoint = '';
        this.warnEmpty = false;
    }
}

class WikifierState {
    @observable public showSpinner: boolean;
    @observable public currRegion: string; // Is it needed?
    @observable public scope: number; // Is it needed?
    @observable public qnodeData: any;
    @observable public rowData: any;


    constructor() {
        this.showSpinner = false;
        this.currRegion = '';
        this.scope = 0;
        this.qnodeData = {};
        this.rowData = [];
    }

    @action
    public updateWikifier(qnodeData: any = {}, rowData: any = []) {
        this.qnodeData = qnodeData;
        this.rowData = rowData;
    }
}

class OutputState {
    @observable public showSpinner: boolean;
    @observable public isDownloadDisabled: boolean;
    @observable public col: string;
    @observable public row: string;
    @observable public json: any;
    
    // Computed property showOutput that returns true when the output should be shown.
    @computed get showOutput(): boolean {
        return this.row !== '' && this.col !== '';
    }

    @action
    public updateOutput(colName: string, rowName: string, json: any) {
        this.col = colName;
        this.row = rowName;
        this.json = json;
    }


    @action
    public clearOutput() {
        this.col = '';
        this.row = '';
    }

    constructor() {
        this.showSpinner = false;
        this.isDownloadDisabled = true;
        this.col = '';
        this.row = '';
    }
}

class YamlEditorState {
    @observable public yamlText?: string;
}


class WikiStore {
    @observable public editors = new EditorsState();
    @observable public table = new TableState();
    @observable public settings = new SettingsState();
    @observable public wikifier = new WikifierState();
    @observable public output = new OutputState();
    @observable public yaml = new YamlEditorState();
    @observable public displayMode: DisplayMode = 'project-list';
    @observable public projects = new ProjectList();

    @action
    public changeProject(path?: string) {
        if (path) {
            this.displayMode = 'project';
            if (path) {
                ipcRenderer.send('show-project', path)
            }
            this.projects.setCurrent(path);
        } else {
            this.displayMode = 'project-list';
            ipcRenderer.send('show-project', null);
        }
    }
}


const wikiStore = new WikiStore();
export default wikiStore;
