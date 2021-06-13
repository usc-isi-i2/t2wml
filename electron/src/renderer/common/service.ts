import { action } from 'mobx';
import wikiStore from '../data/store';
import { currentFilesService } from './current-file-service';
import { backendGet, backendPost, backendPut } from './comm';
import {
  ResponseWithProjectDTO, ResponseWithMappingDTO, ResponseWithTableDTO, ResponseWithQNodeLayerDTO,
  ResponseCallWikifierServiceDTO, ResponseUploadEntitiesDTO, ResponseWithEverythingDTO, ResponseWithProjectAndMappingDTO,
  TableDTO, GlobalSettingsDTO, ResponseEntitiesPropertiesDTO, QNode, ResponseWithProjectandFileName, ResponseWithQNodesDTO, ResponseWithSuggestion, ResponseWithPartialCsvDTO, ResponseWithAnnotationsDTO,
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
    wikiStore.layers.updateFromDTO(response.layers);
    wikiStore.yaml.yamlContent = response.yamlContent;
    wikiStore.yaml.yamlError = response.yamlError;
    wikiStore.annotations.blocks = response.annotations || [];
  }

  @action
  public fillTable(response: ResponseWithTableDTO) {
    wikiStore.table.updateTable(response.table);
    this.fillMapping(response);
  }

  @action
  public updateProjectandQnode(response: ResponseWithQNodeLayerDTO) {
    console.log("qnode", response)
    wikiStore.layers.updateFromDTO(response.layers);
    wikiStore.project.projectDTO = response.project;
  }

  public async getPartialCsv() {
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/partialcsv?${this.getMappingParams()}`) as ResponseWithPartialCsvDTO;
    updater.update(() => { wikiStore.layers.partialCsv = response.partialCsv; }, "getPartialCsv");
  }


  public async getProperties(search: string, type: string) {
    const url = `/properties?q=${search}&data_type=${type}`;
    const response = await backendGet(url) as ResponseWithQNodesDTO;
    wikiStore.annotateProperties.properties = response.qnodes;
  }

  public async getQNodes(search: string, isClass: boolean, instanceOf?: QNode, searchProperties?: boolean, isSubject = false) {
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
    const response = await backendGet(url) as ResponseWithQNodesDTO;
    if (isSubject) {
      wikiStore.subjectQnodes.qnodes = response.qnodes;
    } else {
      wikiStore.wikifyQnodes.qnodes = response.qnodes;
    }

  }

  public async postQNodes(values: any) {
    const response = await backendPost(`/set_qnode?${this.getDataFileParams(false)}`, values) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async removeQNodes(values: any) {
    const response = await backendPost(`/remove_qnode?${this.getDataFileParams(false)}`, values) as ResponseWithQNodeLayerDTO;
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
    const response = await backendPost(`/yaml/apply?${this.getMappingParams()}`, data) as ResponseWithProjectAndMappingDTO;
    this.fillMapping(response)
    wikiStore.project.projectDTO = response.project;
  }

  public async createAnnotation(data: any): Promise<string> {
    const response = await backendPost(`/annotation/create?${this.getProjectFolder()}`, data) as ResponseWithProjectandFileName;
    wikiStore.project.projectDTO = response.project;
    return response.filename;
  }

  public async postAnnotationBlocks(data: any) {
    const updater = currentFilesService.createUpdater();
    const response = await backendPost(`/annotation?${this.getDataFileParams()}`, data) as ResponseWithProjectAndMappingDTO;
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
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/annotation/guess-blocks?${this.getMappingParams()}`) as ResponseWithAnnotationsDTO;
    updater.update(() => { wikiStore.annotations.blocks = response.annotations || [];
                           wikiStore.yaml.yamlContent = response.yamlContent;}, "getsuggestedAnnotationBlocks")
  }

  public async createProject(folder: string, data?: any) {
    const response = await backendPost(`/project?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.project.projectDTO = response.project; // not necessary?
    wikiStore.changeWindowDisplayMode(folder);
  }

  public async getProject(folder: string) {
    console.debug('getProject called for ', folder);
    const response = await backendGet(`/project?project_folder=${folder}`) as ResponseWithProjectDTO;
    console.debug('Response returned ', response);
    this.switchProjectState(response);
  }

  public async uploadDataFile(folder: string, data: any) {
    const updater = currentFilesService.createUpdater();
    const response = await backendPost(`/data?project_folder=${folder}`, data) as ResponseWithEverythingDTO;
    updater.update(() => this.fillTable(response), "uploadDataFile");
  }

  public async uploadWikifierOutput(data: any) {
    debugger
    const response = await backendPost(`/wikifier?${this.getDataFileParams(false)}`, data) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async callWikifierService(data: any) {
    const response = await backendPost(`/wikifier_service?${this.getDataFileParams(false)}`, data) as ResponseCallWikifierServiceDTO;
    this.updateProjectandQnode(response);
  }

  public async callAutoCreateWikinodes(data: any) {
    const response = await backendPut(`/auto_wikinodes?${this.getDataFileParams()}`, data) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async callCountryWikifier(data: any){
    const updater = currentFilesService.createUpdater();
    const response = await backendPost(`/web/wikify_region?${this.getDataFileParams(false)}`, data) as ResponseCallWikifierServiceDTO;
    updater.update(() => { this.updateProjectandQnode(response);
      wikiStore.wikifier.wikifierError = response.wikifierError; })
  }

  public async getTable() {
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/table?${this.getMappingParams()}`) as ResponseWithTableDTO;
    updater.update(() => this.fillTable(response), "getTable");
  }

  public async getMappingCalculation() {
    const updater = currentFilesService.createUpdater();
    const response = await backendGet(`/mapping?${this.getMappingParams()}`) as ResponseWithMappingDTO;
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
    wikiStore.wikifier.entitiesStats = response.entitiesStats;
  }

  public async getEntities() {
    const response = await backendGet(`/project/entities?${this.getDataFileParams()}`) as ResponseEntitiesPropertiesDTO; // TODO- check the type
    wikiStore.entitiesData.entities = response;
  }

  public async saveEntities(data: any) {
    const response = await backendPut(`/project/entities?${this.getDataFileParams()}`, data) as ResponseEntitiesPropertiesDTO;
    wikiStore.entitiesData.entities = response;
  }

  public async downloadResults(fileType: string, allResults: boolean=false) {
    //returns "data" (the download), "error": None, and "internalErrors"
    let url=""
    if (allResults){
      url=`/project/download/${fileType}/all?${this.getProjectFolder()}`
    }else{
      url=`/project/download/${fileType}?${this.getMappingParams()}`
    }
    const response = await backendGet(url);
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

  public async createQnode(entityFields: EntityFields, selection?: number[][]){
    const response = await backendPost(`/create_node?${this.getDataFileParams(false)}`, {...entityFields, selection: selection}) as ResponseWithQNodeLayerAndQnode;
    if(response.layers.qnode){
      this.updateProjectandQnode(response);
    }
    return response;
  }

  public async getQnodeById(id?: string){
    if ( !id ){ return; }
    try {
      const response = await backendGet(`/query_node/${id}?${this.getDataFileParams()}`)as QNode;
      return response;
    } catch (error) {
      if(error.errorCode === 404){
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
