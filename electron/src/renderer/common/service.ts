import { action } from 'mobx';
import wikiStore from '../data/store';
import { saveFiles } from '../project/save-files';
import { backendGet, backendPost, backendPut } from './comm';
import {
  ResponseWithProjectDTO, ResponseWithMappingDTO, ResponseWithTableDTO, ResponseWithQNodeLayerDTO,
  ResponseCallWikifierServiceDTO, ResponseUploadEntitiesDTO, ResponseWithEverythingDTO, ResponseWithProjectAndMappingDTO
} from './dtos';
import { ErrorMessage } from './general';


export interface IStateWithError {
  errorMessage: ErrorMessage;
}



class RequestService {

  public getProjectFolder() {
    return `project_folder=${wikiStore.projects.projectDTO!.directory}`
  }

  public getDataFileParams(required = true) {
    if (!saveFiles.currentState.dataFile && required){
      console.error("There is no data file") //TODO: actual proper error handling?
    }
    return this.getProjectFolder()+`&data_file=${saveFiles.currentState.dataFile}&sheet_name=${saveFiles.currentState.sheetName}`
  }

  public getMappingParams(required = true){
    let url=this.getDataFileParams();
    if (saveFiles.currentState.mappingFile) {
      url += `&mapping_file=${saveFiles.currentState.mappingFile}`
      url += `&mapping_type=${saveFiles.currentState.mappingType}`;
    }
    return url;
  }

  @action
  public switchProjectState(response: ResponseWithProjectDTO){
    saveFiles.getFiles(response.project);
    wikiStore.projects.projectDTO = response.project;
  }

  @action
  public fillMapping(response: ResponseWithMappingDTO){
    wikiStore.projects.projectDTO = response.project;
    wikiStore.layers.updateFromDTO(response.layers);
    wikiStore.yaml.yamlContent = response.yamlContent;
    wikiStore.yaml.yamlError = response.yamlError;
    wikiStore.annotations.blocks = response.annotations;
  }

  @action
  public fillTable(response: ResponseWithTableDTO){
    wikiStore.table.table = response.table;
    this.fillMapping(response);
  }

  @action
  public updateProjectandQnode(response: ResponseWithQNodeLayerDTO){
    wikiStore.layers.updateFromDTO(response.layers);
    wikiStore.projects.projectDTO = response.project;
  }


  public async postAnnotationBlocks(data: any) {
    const response = await backendPost(`/annotation?${this.getDataFileParams()}`, data) as ResponseWithProjectAndMappingDTO;
    wikiStore.projects.projectDTO = response.project;
    this.fillMapping(response);
  }

  public async createProject(folder: string) {
    const response = await backendPost(`/project?project_folder=${folder}`) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project; // not necessary?
    wikiStore.changeProject(folder);
  }

  public async uploadDataFile(folder: string, data: any) {
    const response = await backendPost(`/data?project_folder=${folder}`, data) as ResponseWithEverythingDTO;
    this.fillTable(response);
  }


  public async uploadWikifierOutput(data: any) {
    const response = await backendPost(`/wikifier?${this.getDataFileParams(false)}`, data) as ResponseWithQNodeLayerDTO;
    this.updateProjectandQnode(response);
  }

  public async uploadYaml(data: any) {
    const response = await backendPost(`/yaml/apply?${this.getMappingParams()}`, data) as ResponseWithProjectAndMappingDTO;
    this.fillMapping(response)
    wikiStore.projects.projectDTO = response.project;
  }

  public async callWikifierService(data: any) {
    const response = await backendPost(`/wikifier_service?${this.getDataFileParams(false)}`, data) as ResponseCallWikifierServiceDTO;
    this.updateProjectandQnode(response);
    wikiStore.wikifier.wikifierError = response.wikifierError;
  }

  public async getProject(folder: string) {
    const response = await backendGet(`/project?project_folder=${folder}`) as ResponseWithProjectDTO;
    this.switchProjectState(response);
  }

  public async getTable() {
    const response = await backendGet(`/table?${this.getMappingParams()}`) as ResponseWithTableDTO;
    this.fillTable(response);
  }

  public async getYamlCalculation() {
    const response = await backendGet(`/mapping?${this.getMappingParams()}`) as ResponseWithMappingDTO;
    this.fillMapping(response);
  }


  public async getAnnotationCalculation() {
    const response = await backendGet(`/mapping?${this.getMappingParams()}`) as ResponseWithMappingDTO;
    this.fillMapping(response);
  }

  public async renameProject(folder: string, data: any) {
    //returns project
    const response = await backendPut(`/project?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project; // not necessary
  }

  public async getSettings(folder: string, data: any) {
    //returns endpoint, warnEmpty
    const response = await backendPut(`/project/settings?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project;
  }

  public async uploadEntities(data: any) {
    const response = await backendPost(`/project/entity?${this.getDataFileParams(false)}`, data) as ResponseUploadEntitiesDTO;
    this.updateProjectandQnode(response);
    wikiStore.wikifier.entitiesStats = response.entitiesStats;
  }

  public async downloadResults(fileType: string) {
    //returns "data" (the download), "error": None, and "internalErrors"
    const response = await backendGet(`/project/download/${fileType}?${this.getMappingParams()}`);
    return response;
  }

  public async loadToDatamart() {
    const response = await backendGet(`/project/datamart?${this.getMappingParams()}`);
    return response;
  }

  public async renameYaml(folder: string, data: any) {
    const response = await backendPost(`/yaml/rename?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project;
  }

  public async saveYaml(data: any) {
    const response = await backendPost(`/yaml/save?${this.getDataFileParams()}`, data) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project;
  }

  public async call<IProp, IState extends IStateWithError, ReturnValue>(
    component: React.Component<IProp, IState>,
    func: () => Promise<ReturnValue>) {
    component.setState({ errorMessage: {} as ErrorMessage });
    try {
      return await func();
    } catch (error) {
      component.setState({ errorMessage: error })
      throw error
    }
  }
}


export default RequestService;
