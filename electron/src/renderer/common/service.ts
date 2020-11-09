import wikiStore from '../data/store';
import { backendGet, backendPost, backendPut } from './comm';
import {
  GetProjectResponseDTO, ProjectDTO, UploadDataFileResponseDTO, UploadWikifierOutputResponseDTO, ResponseWithProjectDTO,
  UploadYamlResponseDTO, UploadEntitiesDTO, CallWikifierServiceDTO, TableDTO, LayersDTO, ChangeSheetResponseDTO, ResponseWithLayersDTO, ChangeDataFileResponseDTO
} from './dtos';
import { ErrorMessage } from './general';

export interface IStateWithError {
  errorMessage: ErrorMessage;
}

class StoreFiller {
  //I have created this class to setion off all the filling functions, which were seriously cluttering up service
  public fillProjectInStore(project: ProjectDTO) {
    wikiStore.projects.projectDTO = project;
  }
  public fillTableInStore(table: TableDTO) {
    wikiStore.table.table = table;
  }
  public fillLayersInStore(layers: LayersDTO) {
    wikiStore.layers.updateFromDTO(layers)  // respone.layers should be LayersDTO, instead of casting
  }
  public fillYamlContentInStore(content: string) {
    wikiStore.yaml.yamlContent = content;
  }


  public fillUploadDataInStore(response: UploadDataFileResponseDTO) {
    this.fillProjectInStore(response.project);
    this.fillTableInStore(response.table);
    this.fillLayersInStore(response.layers);
  }

  public fillgetProjectData(response: GetProjectResponseDTO) {
    this.fillUploadDataInStore(response);
    this.fillYamlContentInStore(response.yamlContent);
    wikiStore.yaml.yamlError = response.yamlError;
  }

  public fillProjectAndLayers(response: ResponseWithLayersDTO) {
    this.fillProjectInStore(response.project);
    this.fillLayersInStore(response.layers);
    wikiStore.yaml.yamlError = response.yamlError;
  }

  public fillCallWikifier(response: CallWikifierServiceDTO) {
    this.fillProjectAndLayers(response);
    wikiStore.wikifier.wikifierError = response.wikifierError;
  }

  public fillEntitiesData(response: UploadEntitiesDTO) {
    this.fillProjectAndLayers(response);
    wikiStore.wikifier.entitiesStats = response.entitiesStats;
  }
}

class RequestService {
  storeFiller = new StoreFiller();

  public async createProject(folder: string) {
    const response = await backendPost(`/project?project_folder=${folder}`) as ResponseWithProjectDTO;
    this.storeFiller.fillProjectInStore(response.project); // not necessary
    wikiStore.changeProject(folder);
  }

  public async uploadDataFile(folder: string, formData: any) {
    const response = await backendPost(`/data?project_folder=${folder}`, formData) as UploadDataFileResponseDTO;
    this.storeFiller.fillUploadDataInStore(response);
  }

  public async changeSheet(folder: string, sheetName: string) {
    const response = await backendGet(`/data/${sheetName}?project_folder=${folder}`) as ChangeSheetResponseDTO;
    this.storeFiller.fillgetProjectData(response);
  }

  public async changeDataFile(dataFileName: string, folder: string) {
    const response = await backendGet(`/data/change_data_file?data_file=${dataFileName}&project_folder=${folder}`) as ChangeDataFileResponseDTO;
    this.storeFiller.fillgetProjectData(response);
  }

  public async uploadWikifierOutput(folder: string, formData: any) {
    const response = await backendPost(`/wikifier?project_folder=${folder}`, formData) as UploadWikifierOutputResponseDTO;
    this.storeFiller.fillProjectAndLayers(response);
  }

  public async uploadYaml(folder: string, formData: any) {
    const response = await backendPost(`/yaml?project_folder=${folder}`, formData) as UploadYamlResponseDTO;
    this.storeFiller.fillProjectAndLayers(response);
  }

  public async callWikifierService(folder: string, formData: any) {
    const response = await backendPost(`/wikifier_service?project_folder=${folder}`, formData) as CallWikifierServiceDTO;
    this.storeFiller.fillCallWikifier(response);
  }

  public async getProject(folder: string) {
    const response = await backendGet(`/project?project_folder=${folder}`) as GetProjectResponseDTO;
    this.storeFiller.fillgetProjectData(response);
  }

  public async renameProject(folder: string, formData: any) {
    //returns project
    const response = await backendPut(`/project?project_folder=${folder}`, formData) as ResponseWithProjectDTO;
    this.storeFiller.fillProjectInStore(response.project); // not necessary
  }

  public async getSettings(folder: string, formData: any) {
    //returns endpoint, warnEmpty
    const response = await backendPut(`/project/settings?project_folder=${folder}`, formData) as ResponseWithProjectDTO;
    this.storeFiller.fillProjectInStore(response.project);
  }

  public async uploadEntities(folder: string, formData: any) {
    const response = await backendPost(`/project/entity?project_folder=${folder}`, formData) as UploadEntitiesDTO;
    this.storeFiller.fillEntitiesData(response);
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
