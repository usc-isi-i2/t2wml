import { action } from 'mobx';
import wikiStore from '../data/store';
import { saveFiles, StateParams, CurrentFiles } from '../project/save-files';
import { backendGet, backendPost, backendPut } from './comm';
import {
  ResponseWithTableandMaybeYamlDTO, ResponseWithProjectDTO, ResponseWithAnnotationsDTO,
   UploadEntitiesDTO, CallWikifierServiceDTO, ResponseWithLayersDTO,
} from './dtos';
import { ErrorMessage } from './general';


export interface IStateWithError {
  errorMessage: ErrorMessage;
}


class StoreFiller {
  //I have created this class to setion off all the filling functions, which were seriously cluttering up service
  public fillProject(response: ResponseWithProjectDTO) {
    wikiStore.projects.projectDTO = response.project;
    saveFiles.getFiles(response.project);
  }
  
  @action
  public fillTableAndLayers(response: ResponseWithTableandMaybeYamlDTO){
    wikiStore.table.table = response.table;
    wikiStore.layers.updateFromDTO(response.layers);
    if (response.yamlContent){
      wikiStore.yaml.yamlContent = response.yamlContent;
    }
    wikiStore.yaml.yamlError = response.yamlError;
  }

  @action
  public fillProjectLayersYaml(response: ResponseWithTableandMaybeYamlDTO) {
    wikiStore.projects.projectDTO = response.project;
    saveFiles.getFiles(response.project);
    this.fillTableAndLayers(response);
  }

  @action
  public fillProjectAndLayers(response: ResponseWithLayersDTO) {
    wikiStore.projects.projectDTO = response.project;
    wikiStore.layers.updateFromDTO(response.layers);
    wikiStore.yaml.yamlError = response.yamlError;
  }

  // @action
  // public fillChangeDataFile(response: ResponseWithTableandMaybeYamlDTO) {
  //   // don't change project when changing file in file tree
  //   wikiStore.projects.projectDTO!._saved_state = response.project._saved_state;

  //   this.fillTableAndLayers(response);

  //   // clear output window
  //   wikiStore.table.selectedCell = new Cell();
  // }

  @action
  public fillAnnotations(response: ResponseWithAnnotationsDTO){
    wikiStore.yaml.yamlContent = response.yamlContent;
    wikiStore.annotations.blocks = response.annotations;
    wikiStore.projects.projectDTO = response.project;
  }
}

class RequestService {
  storeFiller = new StoreFiller();

  public getStateParams(params: StateParams) {
    let url = `project_folder=${params.directory}&data_file=${params.dataFile}&sheet_name=${params.sheetName}`;
    if (params.yamlFile) {
      url += `&yaml_file=${params.yamlFile}`;
    }
    if (params.annotationFile) {
      url += `&annotation_file=${params.annotationFile}`;
    }
    return url;
  }

  public async getAnnotationBlocks(folder: string) {
    const response = await backendGet(`/annotation?project_folder=${folder}`) as ResponseWithAnnotationsDTO;
    this.storeFiller.fillAnnotations(response)
  }

  public async postAnnotationBlocks(folder: string, data: any) {
    const response = await backendPost(`/annotation?project_folder=${folder}`, data) as ResponseWithAnnotationsDTO;
    this.storeFiller.fillAnnotations(response)
  }

  public async createProject(folder: string) {
    const response = await backendPost(`/project?project_folder=${folder}`) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project; // not necessary
    wikiStore.changeProject(folder);
  }

  public async uploadDataFile(folder: string, data: any) {
    const response = await backendPost(`/data?project_folder=${folder}`, data) as ResponseWithTableandMaybeYamlDTO;
    this.storeFiller.fillProjectLayersYaml(response);
  }

  // public async changeSheet(folder: string, sheetName: string) {
  //   const response = await backendGet(`/data/${sheetName}?project_folder=${folder}`) as ResponseWithTableandMaybeYamlDTO;
  //   this.storeFiller.fillProjectLayersYaml(response);
  // }

  // public async changeDataFile(dataFileName: string, folder: string) {
  //   const response = await backendGet(`/data/change_data_file?data_file=${dataFileName}&project_folder=${folder}`) as ResponseWithTableandMaybeYamlDTO;
  //   this.storeFiller.fillProjectLayersYaml(response);
  // }

  public async uploadWikifierOutput(folder: string, data: any) {
    const response = await backendPost(`/wikifier?project_folder=${folder}`, data) as ResponseWithLayersDTO;
    this.storeFiller.fillProjectAndLayers(response);
  }

  public async uploadYaml(folder: string, data: any) {
    const response = await backendPost(`/yaml/apply?project_folder=${folder}`, data) as ResponseWithLayersDTO;
    this.storeFiller.fillProjectAndLayers(response);
  }

  public async callWikifierService(folder: string, data: any) {
    const response = await backendPost(`/wikifier_service?project_folder=${folder}`, data) as CallWikifierServiceDTO;
    this.storeFiller.fillProjectAndLayers(response);
    wikiStore.wikifier.wikifierError = response.wikifierError;
  }

  public async getProject(folder: string) {
    const response = await backendGet(`/project?project_folder=${folder}`) as ResponseWithTableandMaybeYamlDTO;
    this.storeFiller.fillProject(response);
  }

  public async getYamlCalculation(params: CurrentFiles) {
    const stateParams = {...params, directory: wikiStore.projects.projectDTO?.directory} as StateParams;
    const response = await backendGet(`/calculation/yaml?${this.getStateParams(stateParams)}`) as ResponseWithTableandMaybeYamlDTO;
    this.storeFiller.fillProjectLayersYaml(response);
  }

  public async getAnnotationCalculation(params: StateParams) {
    const response = await backendGet(`/calculation/annotation?${this.getStateParams(params)}`) as ResponseWithTableandMaybeYamlDTO;
    this.storeFiller.fillProjectLayersYaml(response);
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

  public async uploadEntities(folder: string, data: any) {
    const response = await backendPost(`/project/entity?project_folder=${folder}`, data) as UploadEntitiesDTO;
    this.storeFiller.fillProjectAndLayers(response);
    wikiStore.wikifier.entitiesStats = response.entitiesStats;
  }

  public async downloadResults(folder: string, fileType: string) {
    //returns "data" (the download), "error": None, and "internalErrors"
    const response = await backendGet(`/project/download/${fileType}?project_folder=${folder}`);
    return response;
  }

  public async loadToDatamart(folder: string) {
    const response = await backendGet(`/project/datamart?project_folder=${folder}`);
    return response;
  }

  public async renameYaml(folder: string, data: any) {
    const response = await backendPost(`/yaml/rename?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project;
  }

  public async saveYaml(folder: string, data: any) {
    const response = await backendPost(`/yaml/save?project_folder=${folder}`, data) as ResponseWithProjectDTO;
    wikiStore.projects.projectDTO = response.project;
  }

  // public async changeYaml(folder: string, filename: string) {
  //   const response = await backendGet(`yaml/change?project_folder=${folder}&yaml_file=${filename}`) as ResponseWithTableandMaybeYamlDTO;
  //   this.storeFiller.fillProjectLayersYaml(response);
  // }

  public async call<IProp, IState extends IStateWithError, ReturnValue >(
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
