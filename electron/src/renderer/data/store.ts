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
    @observable public updateYamlRegions: (newYamlRegions?: any) => void;
    @observable public updateQnodeCells: (qnodes?: any, rowData?: any) => void;
    @observable public updateTableData: (tableData?: any) => void; // tableData as type TableData
    @observable public updateStyleByCell: (colName: string | number | null, rowName: string | number | null, style: any, override?: boolean) => void;
    @observable public handleOpenWikifierFile:(event: any) => void;
    
    constructor() {
        this.isCellSelectable = false;

        this.showSpinner = false;
        this.errorCells = undefined;
        this.dataRegionsCells = [];
        this.updateYamlRegions = () => undefined;
        this.updateQnodeCells = () => undefined;
        this.updateTableData = () => undefined;
        this.updateStyleByCell = () => undefined;
        this.handleOpenWikifierFile = () => undefined;
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

class WikifierInnerState {
    @observable public qnodeData: any = {};
    @observable public currRegion = ''; // Is it needed?
}
class WikifierState {
    @observable public showSpinner: boolean;
    @observable public updateWikifier: (qnodeData?: any, rowData?: any) => void;
    @observable public state: WikifierInnerState | undefined;
    @observable public scope: number; // Is it needed?

    constructor() {
        this.showSpinner = false;
        this.updateWikifier = () => undefined;
        this.state = new WikifierInnerState();
        this.scope = 0;
    }
}

class OutputState {
    @observable public showSpinner: boolean;
    @observable public isDownloadDisabled: boolean;
    // TODO: Add the three fields - row, col, json
    // TODO: Add a computed property showOutput that returns true when the output should be shown (if row and col !== '')

    // TODO: Add a function updateOutput that sets col, row, json. Make it an @action
    @action
    public updateOutput(colName: string, rowName: string, json: any) { 
        //
    };

    // TODO: Add a function removeOutput that sets colName and rowName to '', make it in @action
    @action
    public clearOutput() {
        //
    } ;

    constructor() {
        this.showSpinner = false;
        this.isDownloadDisabled = true;
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
