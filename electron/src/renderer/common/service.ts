import { backendGet, backendPost, backendPut } from './comm';
import { GetProjectResponseDTO, ProjectDTO, UploadDataFileResponseDTO, UploadWikifierOutputResponseDTO, 
  UploadYamlResponseDTO, UploadEntitiesDTO, CallWikifierServiceDTO } from './dtos';

// I did it as a class because we will add a state instance

class RequestService {

  public async createProject(folder: string): Promise<ProjectDTO> {
    const response = await backendPost(`/project?project_folder=${folder}`) as ProjectDTO;
    return response;
  }
  
  public async uploadDataFile(folder: string, formData: any): Promise<UploadDataFileResponseDTO> {
    const response = await backendPost(`/data?project_folder=${folder}`, formData) as UploadDataFileResponseDTO;
    return response;
  }

  public async changeSheet(folder: string, sheetName: string): Promise<GetProjectResponseDTO> {
    const response = await backendGet(`/data/${sheetName}?project_folder=${folder}`) as GetProjectResponseDTO;
    return response;
  }

  public async uploadWikifierOutput(folder: string, formData: any): Promise<UploadWikifierOutputResponseDTO> {
    const response = await backendPost(`/wikifier?project_folder=${folder}`, formData) as UploadWikifierOutputResponseDTO;
    return response;
  }

  public async uploadYaml(folder: string, formData: any): Promise<UploadYamlResponseDTO> {
    const response = await backendPost(`/yaml?project_folder=${folder}`, formData) as UploadYamlResponseDTO;
    return response;
  }

  public async downloadResults(folder: string, fileType: string) {
    //returns "data" (the download), "error": None, and "internalErrors"
    const response = await backendGet(`/project/download/${fileType}?project_folder=${folder}`);
    return response;
  }

  public async callWikifierService(folder: string, formData: any): Promise<CallWikifierServiceDTO> {
    //returns project, rowData, qnodes
    //also returns problemCells (an error dict, or False)
    const response = await backendPost(`/wikifier_service?project_folder=${folder}`, formData) as CallWikifierServiceDTO;
    return response;
  }

  public async getProject(folder: string): Promise<GetProjectResponseDTO> {
    const response = await backendGet(`/project?project_folder=${folder}`) as GetProjectResponseDTO;
    return response;
  }

  public async renameProject(folder: string, formData: any): Promise<ProjectDTO> {
    //returns project
    const response = await backendPut(`/project?project_folder=${folder}`, formData) as ProjectDTO;
    return response;
  }

  public async getSettings(folder: string, formData: any): Promise<ProjectDTO> {
    //returns endpoint, warnEmpty
    const response = await backendPut(`/project/settings?project_folder=${folder}`, formData) as ProjectDTO;
    return response;
  }

  public async uploadEntities(folder: string, formData: any): Promise<UploadEntitiesDTO> {
    //returns "widget", "project", "rowData", "qnodes"
    const response = await backendPost(`/project/entity?project_folder=${folder}`, formData) as UploadEntitiesDTO;
    return response;
  }
  
  public async loadToDatamart(folder: string) {
    //returns "description" (an error message) or "datamart_get_url"
    const response = await backendGet(`/project/datamart?project_folder=${folder}`);
    return response;
  }

}

export default RequestService;
