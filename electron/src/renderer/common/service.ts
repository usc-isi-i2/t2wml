import { action } from 'mobx';
import wikiStore from '../data/store';
import { currentFilesService } from './current-file-service';
import { backendGet, backendPost, backendPut } from './comm';
import {
  ResponseWithProjectDTO, ResponseWithMappingDTO, ResponseWithTableDTO, ResponseWithQNodeLayerDTO,
  ResponseCallWikifierServiceDTO, ResponseUploadEntitiesDTO, ResponseWithEverythingDTO, ResponseWithProjectAndMappingDTO,
  TableDTO, GlobalSettingsDTO, ResponseEntitiesPropertiesDTO, QNode, ResponseWithProjectandFileName, ResponseWithQNodesDTO, ResponseWithSuggestion, ResponseWithPartialCsvDTO,
  EntityFields,
  ResponseWithQNodeLayerAndQnode
} from './dtos';
import { ErrorMessage } from './general';



export interface IStateWithError {
  errorMessage: ErrorMessage;
}


class RequestService {
  public getProjectFolder() {
    let folder: string;

    if (wikiStore.project?.projectDTO?.directory) {
      console.log("Returning project folder from wikiStore.project.projectDTO", wikiStore.project.projectDTO);
      folder = wikiStore.project.projectDTO.directory;
    } else {
      console.warn("There is no projectDTO directory", wikiStore.project.projectDTO);

      if (wikiStore.projects.current?.folder) {
        folder = wikiStore.projects.current.folder;
        console.log('Reverting to folder for current project', wikiStore.projects.current.folder);
      } else {
        console.error("There is no current project either, this is the race condition happening");
        throw new Error("Can't determine project folder");
      }
    }

    return `project_folder=${folder}`;
  }

  private getIndex(startIndex = 0, endIndex = 50) {
    if (wikiStore.table.currentRowIndex) {
      startIndex = wikiStore.table.currentRowIndex - 50;
      endIndex = wikiStore.table.currentRowIndex + 50;
    }
    if (startIndex < 0) { startIndex = 0; }
    return [startIndex, endIndex]
  }

  public getDataFileParams(required = true) {
    if (!currentFilesService.currentState.dataFile) {
      if (required) {
        console.error("There is no data file"); //TODO: actual proper error handling?
      }
      return this.getProjectFolder();
    }
    return this.getProjectFolder() + `&data_file=${currentFilesService.currentState.dataFile}&sheet_name=${currentFilesService.currentState.sheetName}`;
  }

  public getMappingParams() {
    let url = this.getDataFileParams();
    if (currentFilesService.currentState.mappingFile) {
      url += `&mapping_file=${currentFilesService.currentState.mappingFile}`;
      url += `&mapping_type=${currentFilesService.currentState.mappingType}`;
    }
    return url;
  }

  @action
  public switchProjectState(response: ResponseWithProjectDTO) {
    console.debug('switchProjectState called');
    wikiStore.project.projectDTO = response.project;
    currentFilesService.getFiles(response.project);

    // new project
    if (!Object.keys(response.project.data_files).length) {
      this.resetPreProject();
    }
  }

  @action
  public resetPreProject() {
    wikiStore.table.updateTable({} as TableDTO);
    wikiStore.layers.resetLayers();
    wikiStore.yaml.yamlContent = '';
    wikiStore.yaml.yamlError = undefined;
    wikiStore.annotations.blocks = [];
  }

  @action
  public fillMapping(response: ResponseWithMappingDTO) {
    console.log("mapping", response)
    wikiStore.layers.partialCsv = {} as TableDTO;
    wikiStore.project.projectDTO = response.project;
    wikiStore.layers.resetFromDTO(response.layers);
    wikiStore.yaml.yamlContent = response.yamlContent;
    wikiStore.yaml.yamlError = response.yamlError;
    wikiStore.annotations.blocks = response.annotations || [];
    wikiStore.table.loadedRows = new Set<number>();
  }

  @action
  public updateMapping(response: ResponseWithMappingDTO) {
    console.log("updateMapping", response)
    wikiStore.layers.updateFromDTO(response.layers);
  }

  @action
  public fillTable(response: ResponseWithTableDTO) {
    wikiStore.table.updateTable(response.table);
    this.fillMapping(response);
  }

  @action
  public updateProjectandQnode(response: ResponseWithQNodeLayerDTO) {
    console.log("qnode", response)
    wikiStore.layers.resetFromDTO(response.layers);
    wikiStore.project.projectDTO = response.project;
  }

  public async getPartialCsv() {
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/partialcsv?${this.getMappingParams()}`) as ResponseWithPartialCsvDTO;
    updater.update(() => { wikiStore.layers.partialCsv = response.partialCsv; }, "getPartialCsv");
  }


  public async getQNodes(search: string, isClass: boolean, instanceOf?: QNode, searchProperties?: boolean) {
    if (!search || !search.trim()) {
      wikiStore.wikifyQnodes.qnodes = [];
      return;
    }
    let url = `/qnodes?q=${search}`;
    if (searchProperties) {
      url = `/properties?q=${search}`;
    }
    if (isClass) {
      url += `&is_class=true`;
    }
    if (instanceOf) {
      url += `&instance_of=${instanceOf.id}`;
    }

    let response = undefined
    try {
      response = await backendGet(url) as ResponseWithQNodesDTO;
    } catch (error) {
      response = undefined
    }
    if ((!response || response.qnodes.length === 0) && search.length > 1 &&
      ((search.toLowerCase().startsWith("q") && !searchProperties) || (search.toLowerCase().startsWith("p") && searchProperties))) {
      const responseQnodeById = await this.getQnodeById(search)
      if (!responseQnodeById && wikiStore.wikifyQnodes.qnodes.length === 1 && wikiStore.wikifyQnodes.qnodes.slice()[0].id.startsWith(search)) {
        return; // if not found node and the list contain just one node that starts like what do you search, dont change the list.
      }
      if (responseQnodeById) {
        wikiStore.wikifyQnodes.qnodes = [responseQnodeById]
      } else {
        wikiStore.wikifyQnodes.qnodes = [];
      }
    } else {
      wikiStore.wikifyQnodes.qnodes = response ? response.qnodes : [];
    }
  }

  public async postQNodes(values: any) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/set_qnode?${this.getDataFileParams(false)}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, values) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async removeQNodes(values: any) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/delete_wikification?${this.getDataFileParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, values) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async addExistingMapping(data: any) {
    const response = await backendPost(`/files/add_mapping?${this.getProjectFolder()}`, data) as ResponseWithProjectandFileName;
    wikiStore.project.projectDTO = response.project;
    return response.filename;
  }

  public async saveYaml(data: any): Promise<string> {
    const response = await backendPost(`/yaml/save?${this.getProjectFolder()}`, data) as ResponseWithProjectandFileName;
    wikiStore.project.projectDTO = response.project;
    return response.filename;
  }

  public async uploadYaml(data: any) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/yaml/apply?${this.getMappingParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, data) as ResponseWithProjectAndMappingDTO;
    this.fillMapping(response)
    wikiStore.project.projectDTO = response.project;
  }

  public async createAnnotation(data: any): Promise<string> {
    const response = await backendPost(`/annotation/create?${this.getProjectFolder()}`, data) as ResponseWithProjectandFileName;
    wikiStore.project.projectDTO = response.project;
    return response.filename;
  }

  public async postAnnotationBlocks(data: any) {
    const [startIndex, endIndex] = this.getIndex()
    const updater = currentFilesService.createUpdater();
    const response = await backendPost(`/annotation?${this.getDataFileParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, data) as ResponseWithProjectAndMappingDTO;
    updater.update(() => {
      wikiStore.project.projectDTO = response.project;
      this.fillMapping(response);
    }, "postAnnotationBlocks")
  }

  public async getAnnotationSuggestions(data: any): Promise<ResponseWithSuggestion> {
    const response = await backendPut(`/annotation/suggest?${this.getDataFileParams()}`, data) as ResponseWithSuggestion; //TODO
    return response
  }

  public async getSuggestedAnnotationBlocks() {
    const [startIndex, endIndex] = this.getIndex()
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/annotation/guess-blocks?${this.getMappingParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`) as ResponseWithMappingDTO;
    updater.update(() => {
      this.fillMapping(response)
    }, "getsuggestedAnnotationBlocks")
  }

  public async createProject(folder: string, data?: any) {
    const response = await backendPost(`/project?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.project.projectDTO = response.project; // not necessary?
    wikiStore.changeWindowDisplayMode(folder);
  }

  public async getProject(folder: string) {
    const [startIndex, endIndex] = this.getIndex()
    console.debug('getProject called for ', folder);
    const response = await backendGet(`/project?project_folder=${folder}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`) as ResponseWithProjectDTO;
    console.debug('Response returned ', response);
    this.switchProjectState(response);
  }

  public async uploadDataFile(folder: string, data: any) {
    const [startIndex, endIndex] = this.getIndex()
    const updater = currentFilesService.createUpdater();
    const response = await backendPost(`/data?project_folder=${folder}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, data) as ResponseWithEverythingDTO;
    updater.update(() => this.fillTable(response), "uploadDataFile");
  }

  public async uploadWikifierOutput(data: any) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/wikifier?${this.getDataFileParams(false)}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, data) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async callWikifierService(data: any) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/wikifier_service?${this.getDataFileParams(false)}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, data) as ResponseCallWikifierServiceDTO;
    this.updateProjectandQnode(response);
  }

  public async callAutoCreateWikinodes(data: any) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/auto_wikinodes?${this.getDataFileParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, data) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async callCountryWikifier(data: any) {
    const [startIndex, endIndex] = this.getIndex()
    const updater = currentFilesService.createUpdater();
    const response = await backendPost(`/web/wikify_region?${this.getDataFileParams(false)}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, data) as ResponseCallWikifierServiceDTO;
    updater.update(() => {
      this.updateProjectandQnode(response);
      wikiStore.partialCsv.wikifierError = response.wikifierError;
    })
  }

  public async getTable(startIndex = 0, endIndex = 50) {
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/table?${this.getMappingParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`) as ResponseWithTableDTO;
    updater.update(() => this.fillTable(response), "getTable");
  }

  public async getTableByRows(startIndex = 0, endIndex = 0): Promise<TableDTO> {
    // const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/table?${this.getMappingParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`) as ResponseWithTableDTO;
    this.updateMapping(response)
    return response.table
  }

  public async getMappingCalculation() {
    const [startIndex, endIndex] = this.getIndex()
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/mapping?${this.getMappingParams()}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`) as ResponseWithMappingDTO;
    updater.update(() => this.fillMapping(response), "getMappingCalculation");
  }

  public async getSettings(folder: string) {
    const response = await backendGet(`/project/settings?project_folder=${folder}`) as ResponseWithProjectDTO;
    wikiStore.project.projectDTO = response.project;
  }

  public async putSettings(folder: string, data: any) {
    const response = await backendPut(`/project/settings?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.project.projectDTO = response.project;
  }

  public async getGlobalSettings() {
    const response = await backendGet(`/project/globalsettings`) as GlobalSettingsDTO;
    wikiStore.globalSettings.datamart_api = response.datamart_api;
  }

  public async putGlobalSettings(data: any) {
    const response = await backendPut(`/project/globalsettings`, data) as GlobalSettingsDTO;
    wikiStore.globalSettings.datamart_api = response.datamart_api;
  }

  public async uploadEntities(data: any) {
    const response = await backendPost(`/project/entities?${this.getDataFileParams(false)}`, data) as ResponseUploadEntitiesDTO;
    this.updateProjectandQnode(response);
    wikiStore.partialCsv.entitiesStats = response.entitiesStats;
  }

  public async getEntities() {
    const response = await backendGet(`/project/entities?${this.getDataFileParams()}`) as ResponseEntitiesPropertiesDTO; // TODO- check the type
    wikiStore.entitiesData.entities = response;
  }

  public async saveEntities(data: any) {
    const response = await backendPut(`/project/entities?${this.getDataFileParams()}`, data) as ResponseEntitiesPropertiesDTO;
    console.log("saveEntities", response)
    wikiStore.entitiesData.entities = response;
  }

  public async downloadResults(fileType: string, path: string, allResults?: boolean) {
    //returns "data" (the download), "error": None, and "internalErrors"
    let url = ""
    if (allResults) {
      url = `/project/export/${fileType}/all?${this.getProjectFolder()}`
    } else {
      url = `/project/export/${fileType}?${this.getMappingParams()}`
    }
    const data = { 'filepath': path }
    const response = await backendPost(url, data);
    return response;
  }

  public async loadToDatamart() {
    const response = await backendGet(`/project/datamart?${this.getMappingParams()}`);
    return response;
  }

  public async renameFile(folder: string, data: any) {
    const response = await backendPost(`/files/rename?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.project.projectDTO = response.project;
  }

  public async removeOrDeleteFile(folder: string, data: any) {
    const response = await backendPost(`/files/delete?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.project.projectDTO = response.project;
  }

  public async createQnode(entityFields: EntityFields) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/create_node?${this.getDataFileParams(false)}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, { ...entityFields }) as ResponseWithQNodeLayerAndQnode;
    if (response.layers.qnode) {
      this.updateProjectandQnode(response);
    }
    return response;
  }


  public async createQnodes(entityFields: EntityFields, selection?: number[][], value?: string) {
    const [startIndex, endIndex] = this.getIndex()
    const response = await backendPost(`/create_node?${this.getDataFileParams(false)}&map_start=${startIndex}&map_end=${endIndex}&data_start=${startIndex}&data_end=${endIndex}`, { ...entityFields, selection: selection, value: value }) as ResponseWithQNodeLayerAndQnode;
    if (response.layers.qnode) {
      this.updateProjectandQnode(response);
    }
    return response;
  }

  public async getQnodeById(id?: string) {
    if (!id || id.length < 2) { return; }
    try {
      const response = await backendGet(`/query_node/${id[0].toLocaleUpperCase() + id.slice(1)}?${this.getDataFileParams()}`) as QNode;
      return response;
    } catch (error) {
      if (error.errorCode === 404) {
        return;
      }
    }
  }


  public async call<IProp, IState extends IStateWithError, ReturnValue>(
    component: React.Component<IProp, IState>,
    func: () => Promise<ReturnValue>) {

    component.setState({ errorMessage: {} as ErrorMessage });

    try {
      return await func();
    } catch (error) {
      component.setState({ errorMessage: error });
      throw error;
    }
  }
}


export default RequestService;
