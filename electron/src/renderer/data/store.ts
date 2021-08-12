import { observable, action } from 'mobx';
import { ipcRenderer } from 'electron';
import { DisplayMode } from '@/shared/types';
import { ProjectList } from '../project-list/project-entry';
import {
    CleanEntry, EntitiesStatsDTO, Entry, ErrorEntry, LayerDTO, LayersDTO, QNode, QNodeEntry,
    StatementEntry, StatementLayerDTO, TableDTO, TypeEntry, AnnotationBlock, ProjectDTO, ResponseEntitiesPropertiesDTO
} from '../common/dtos';
import { Cell, CellSelection } from '../common/general';
import RequestService from '../common/service';
import { defaultYamlContent } from '../project/default-values';
import { currentFilesService } from '../common/current-file-service';


export type TableMode = 'annotation' | 'output' | 'wikify';
class TableState {

    @observable public mode: TableMode;
    @observable public table: TableDTO;

    @observable public loadedRows: Set<number>;
    @observable public currentRowIndex?: number;

    @observable public showSpinner: boolean;

    @observable public showCleanedData: boolean;
    @observable public showQnodes: boolean;

    @observable public selection = new Selection();

    constructor() {
        this.mode = 'annotation';
        this.table = {} as TableDTO;
        this.showSpinner = false;
        this.showCleanedData = false;
        this.showQnodes = false;
        this.loadedRows = new Set<number>();
    }

    updateTable(table: TableDTO) {
        this.table = table;
        console.log("resetting wikistore selections from wikistore update table")
        this.resetSelections();
    }

    updateSelectionAll(selection?: CellSelection, selectedBlock?: AnnotationBlock, selectedCell?: Cell) {
        // this.selectionArea = selection;
        // this.selectedCell = selectedCell;
        // this.selectedBlock = selectedBlock;
        this.selection = new Selection(selection, selectedBlock, selectedCell);
    }

    updateSelection(selection?: CellSelection, selectedCell?: Cell) {
        this.selection = new Selection(selection, this.selection.selectedBlock, selectedCell);
    }

    selectBlock(block?: AnnotationBlock) {
        this.selection = new Selection(block?.selection || undefined, block);
        // this.selectedBlock = block;
        // this.selectionArea = block?.selection || undefined;
    }

    resetSelections() {
        this.selection = new Selection();
    }
}

class Selection {

    public selectedCell?: Cell;
    public selectedBlock?: AnnotationBlock;
    public selectionArea?: CellSelection;

    constructor(selection?: CellSelection, selectedBlock?: AnnotationBlock, selectedCell?: Cell) {
        this.selectionArea = selection;
        this.selectedBlock = selectedBlock;
        this.selectedCell = selectedCell;
    }
}


class WikifierState {
    @observable public showSpinner: boolean;
    @observable public wikifierError?: string;
    @observable public entitiesStats?: EntitiesStatsDTO;


    constructor() {
        this.showSpinner = false;
    }
}


class OutputState {
    @observable public showSpinner: boolean;
    @observable public isDownloadDisabled: boolean;

    constructor() {
        this.showSpinner = false;
        this.isDownloadDisabled = true;
    }
}


class YamlEditorState {
    public requestService = new RequestService();
    // @observable public yamlName = '';
    // @observable public yamlList: string[] = [];
    @observable public showSpinner = false;
    @observable public yamlContent: string = defaultYamlContent;
    @observable public yamlError?: string;
    @observable public yamlhasChanged = false;

    @observable public async saveYaml() {
        if (!this.yamlhasChanged) {
            return;
        }

        console.log(this.yamlContent);

        // before sending request
        wikiStore.table.showSpinner = true;
        wikiStore.yaml.showSpinner = true;

        // send request
        const data = {
            "yaml": this.yamlContent!,
            "title": currentFilesService.currentState.mappingFile!,
            "dataFile": currentFilesService.currentState.dataFile,
            "sheetName": currentFilesService.currentState.sheetName
        };

        try {
            await this.requestService.saveYaml(data);

            // follow-ups (success)
            wikiStore.output.isDownloadDisabled = false;

        } catch {
            console.error("Save yaml failed.");
        } finally {
            wikiStore.table.showSpinner = false;
            wikiStore.yaml.showSpinner = false;
            this.yamlhasChanged = false;
        }
    }
}

export class Layer<T extends Entry> {
    @observable public entries: T[];
    private entryMap: Map<string, T>;

    constructor(responseLayer?: LayerDTO<T>) {
        this.entryMap = new Map<string, T>();
        if (!responseLayer) {
            this.entries = [];
        }
        else {
            this.entries = responseLayer.entries;
            for (const entry of this.entries) {
                for (const index_pair of entry.indices) {
                    this.entryMap.set(`${index_pair[0]},${index_pair[1]}`, entry);
                }

            }
        }
    }

    public find(cell?: Cell): T | undefined {
        if (cell) {
            const index = `${cell.row},${cell.col}`;
            return this.entryMap.get(index);
        }
        return undefined;
    }

    public update(responseLayer?: LayerDTO<T>) {
        if (!responseLayer) {
            return;
        }
        else {
            for (const entry of responseLayer.entries) {
                for (const index_pair of entry.indices) {
                    this.entryMap.set(`${index_pair[0]},${index_pair[1]}`, entry);
                }
            }
            responseLayer.entries.forEach(entry => {
                this.entries.push(entry)
            });
        }
    }
}

class StatementLayer extends Layer<StatementEntry>{
    qnodes: Map<string, QNode>;

    constructor(responseLayer?: StatementLayerDTO) {
        super(responseLayer);
        if (responseLayer && responseLayer.qnodes) {
            this.qnodes = new Map<string, QNode>(Object.entries(responseLayer.qnodes));
        }
        else {
            this.qnodes = new Map<string, QNode>();
        }
    }

    public getQNode(id: string): QNode {
        const return_val = this.qnodes.get(id);
        if (return_val) {
            return return_val;
        }
        return { "label": id, "url": "", description: "", "id": id };
    }

    updateStatment(responseLayer?: StatementLayerDTO) {
        this.update(responseLayer);
        if (responseLayer && responseLayer.qnodes) {
            const newMap = new Map<string, QNode>(Object.entries(responseLayer.qnodes));
            const merged = new Map([...Array.from(this.qnodes.entries()), ...Array.from(newMap.entries())]);
            this.qnodes = merged;
        }
    }
}


export class LayerState {
    @observable public qnode: Layer<QNodeEntry>;
    @observable public type: Layer<TypeEntry>;
    @observable public statement: StatementLayer;
    @observable public error: Layer<ErrorEntry>;
    @observable public cleaned: Layer<CleanEntry>;
    @observable public partialCsv: TableDTO;

    constructor() {
        this.qnode = new Layer<QNodeEntry>();
        this.type = new Layer<TypeEntry>();
        this.statement = new StatementLayer();
        this.error = new Layer<ErrorEntry>();
        this.cleaned = new Layer<CleanEntry>();
        this.partialCsv = {} as TableDTO;
    }

    @action
    public resetFromDTO(dto: LayersDTO) {
        console.debug('Reset layers: ', dto);
        if (!dto) { return; }

        if (dto.qnode) {
            this.qnode = new Layer(dto.qnode);
        }
        if (dto.type) {
            this.type = new Layer(dto.type);
        }
        if (dto.statement) {
            this.statement = new StatementLayer(dto.statement);
        }
        if (dto.error) {
            this.error = new Layer(dto.error);
        }
        if (dto.cleaned) {
            this.cleaned = new Layer(dto.cleaned);
        }
    }

    @action
    public updateFromDTO(dto: LayersDTO) {
        console.debug('updateFromDTO: ', dto);
        if (!dto) { return; }

        if (dto.qnode) {
            this.qnode.update(dto.qnode);
        }
        if (dto.type) {
            this.type.update(dto.type);
        }
        if (dto.statement) {
            this.statement.updateStatment(dto.statement)
        }
        if (dto.error) {
            this.error.update(dto.error);
        }
        if (dto.cleaned) {
            this.cleaned.update(dto.cleaned);
        }
    }

    @action
    resetLayers() {
        this.qnode = new Layer<QNodeEntry>();
        this.type = new Layer<TypeEntry>();
        this.statement = new StatementLayer();
        this.error = new Layer<ErrorEntry>();
        this.cleaned = new Layer<CleanEntry>();
    }
}


export class AnnotationState {
    @observable public blocks: AnnotationBlock[] = [];
}


export class ProjectState {
    @observable public projectDTO?: ProjectDTO;

    constructor(projectdto?: ProjectDTO) {
        this.projectDTO = projectdto;
    }
}

export class GlobalSettings {
    @observable datamart_api = "";
}

export class EntitiesData {
    @observable entities: ResponseEntitiesPropertiesDTO = {}; //TODO- add type
}

export class WikifyQnodes {
    @observable qnodes: QNode[] = [];
}


class WikiStore {
    @observable public table = new TableState();
    @observable public partialCsv = new WikifierState();
    @observable public output = new OutputState();
    @observable public yaml = new YamlEditorState();
    @observable public layers = new LayerState();
    @observable public annotations = new AnnotationState();

    @observable public displayMode: DisplayMode = 'project-list';
    @observable public projects = new ProjectList();
    @observable public project = new ProjectState();
    @observable public globalSettings = new GlobalSettings();
    @observable public entitiesData = new EntitiesData();
    @observable public wikifyQnodes = new WikifyQnodes();


    @action
    public changeWindowDisplayMode(path?: string) {
        if (path) {
            this.displayMode = 'project';
            if (path) {
                ipcRenderer.send('show-project', path);
            }
            this.projects.setCurrent(path);
        } else {
            this.displayMode = 'project-list';
            ipcRenderer.send('show-project', null);
            currentFilesService.reset()
        }
    }
}


const wikiStore = new WikiStore();
export default wikiStore;
