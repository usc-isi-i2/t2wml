import wikiStore from '../data/store';
import { backendGet, backendPost, backendPut } from './comm';
import { GetProjectResponseDTO, ProjectDTO, UploadDataFileResponseDTO, UploadWikifierOutputResponseDTO, 
  UploadYamlResponseDTO, UploadEntitiesDTO, CallWikifierServiceDTO, TableDTO, LayersDTO, ChangeSheetResponseDTO, ResponseWithLayersDTO, ProjectDTOResponse } from './dtos';

// I did it as a class because we will add a state instance

class RequestService {

  public async createProject(folder: string) {
    const response = await backendPost(`/project?project_folder=${folder}`) as ProjectDTOResponse;
    this.fillProjectInStore(response.project); // not necessary
  }
  
  public async uploadDataFile(folder: string, formData: any) {
    const response = await backendPost(`/data?project_folder=${folder}`, formData) as UploadDataFileResponseDTO;
    this.fillUploadDataInStore(response);
  }

  public async changeSheet(folder: string, sheetName: string) {
    const response = await backendGet(`/data/${sheetName}?project_folder=${folder}`) as ChangeSheetResponseDTO;
    this.fillgetProjectData(response);
  }

  public async uploadWikifierOutput(folder: string, formData: any) {
    const response = await backendPost(`/wikifier?project_folder=${folder}`, formData) as UploadWikifierOutputResponseDTO;
    this.fillProjectAndLayers(response);
  }

  public async uploadYaml(folder: string, formData: any) {
    const response = await backendPost(`/yaml?project_folder=${folder}`, formData) as UploadYamlResponseDTO;
    this.fillProjectAndLayers(response);
  }

  public async downloadResults(folder: string, fileType: string) {
    //returns "data" (the download), "error": None, and "internalErrors"
    const response = await backendGet(`/project/download/${fileType}?project_folder=${folder}`);
    return response;
  }

  public async callWikifierService(folder: string, formData: any) {
    //returns project, rowData, qnodes
    //also returns problemCells (an error dict, or False)
    const response = await backendPost(`/wikifier_service?project_folder=${folder}`, formData) as CallWikifierServiceDTO;
    this.fillCallWikifier(response);
  }

  public async getProject(folder: string) {
    const response = await backendGet(`/project?project_folder=${folder}`) as GetProjectResponseDTO;
    this.fillgetProjectData(response);
  }

  public async renameProject(folder: string, formData: any) {
    //returns project
    const response = await backendPut(`/project?project_folder=${folder}`, formData) as ProjectDTOResponse;
    this.fillProjectInStore(response.project); // not necessary
  }

  public async getSettings(folder: string, formData: any) {
    //returns endpoint, warnEmpty
    const response = await backendPut(`/project/settings?project_folder=${folder}`, formData) as ProjectDTOResponse;
    this.fillProjectInStore(response.project);
  }

  public async uploadEntities(folder: string, formData: any) {
    //returns "widget", "project", "rowData", "qnodes"
    const response = await backendPost(`/project/entity?project_folder=${folder}`, formData) as UploadEntitiesDTO;
    this.fillEntitiesData(response);
  }
  
  public async loadToDatamart(folder: string) {
    //returns "description" (an error message) or "datamart_get_url"
    const response = await backendGet(`/project/datamart?project_folder=${folder}`);
    return response;
  }


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
  }

  public fillProjectAndLayers(response: ResponseWithLayersDTO) {
    this.fillProjectInStore(response.project);
    this.fillLayersInStore(response.layers);
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

export default RequestService;
