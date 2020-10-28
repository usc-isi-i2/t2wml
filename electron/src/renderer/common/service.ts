import wikiStore from '../data/store';
import { backendGet, backendPost, backendPut } from './comm';
import { GetProjectResponseDTO, ProjectDTO, UploadDataFileResponseDTO, UploadWikifierOutputResponseDTO, 
  UploadYamlResponseDTO, UploadEntitiesDTO, CallWikifierServiceDTO, LayersDTO } from './dtos';

// I did it as a class because we will add a state instance

class RequestService {

  public async createProject(folder: string) {
    const response = await backendPost(`/project?project_folder=${folder}`) as ProjectDTO;
    wikiStore.projects.projectDTO = response;
  }
  
  public async uploadDataFile(folder: string, formData: any) {
    const response = await backendPost(`/data?project_folder=${folder}`, formData) as UploadDataFileResponseDTO;
    this.fillStore(response);
  }

  public async changeSheet(folder: string, sheetName: string) {
    const response = await backendGet(`/data/${sheetName}?project_folder=${folder}`) as GetProjectResponseDTO;
    this.fillStore(response);
  }

  public async uploadWikifierOutput(folder: string, formData: any) {
    const response = await backendPost(`/wikifier?project_folder=${folder}`, formData) as UploadWikifierOutputResponseDTO;
    this.fillStore(response);
  }

  public async uploadYaml(folder: string, formData: any) {
    const response = await backendPost(`/yaml?project_folder=${folder}`, formData) as UploadYamlResponseDTO;
    this.fillStore(response);
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
    this.fillStore(response);
  }

  public async getProject(folder: string) {
    const response = await backendGet(`/project?project_folder=${folder}`) as GetProjectResponseDTO;
    this.fillStore(response);
  }

  public async renameProject(folder: string, formData: any) {
    //returns project
    const response = await backendPut(`/project?project_folder=${folder}`, formData) as ProjectDTO;
    wikiStore.projects.projectDTO = response;
  }

  public async getSettings(folder: string, formData: any) {
    //returns endpoint, warnEmpty
    const response = await backendPut(`/project/settings?project_folder=${folder}`, formData) as ProjectDTO;
    wikiStore.projects.projectDTO = response;
  }

  public async uploadEntities(folder: string, formData: any) {
    //returns "widget", "project", "rowData", "qnodes"
    const response = await backendPost(`/project/entity?project_folder=${folder}`, formData) as UploadEntitiesDTO;
    this.fillStore(response);
  }
  
  public async loadToDatamart(folder: string) {
    //returns "description" (an error message) or "datamart_get_url"
    const response = await backendGet(`/project/datamart?project_folder=${folder}`);
    return response;
  }

  public fillStore(response: GetProjectResponseDTO | UploadYamlResponseDTO | UploadDataFileResponseDTO | UploadWikifierOutputResponseDTO) {
    // Talya - this is a bad way of writing this. You should probably have one fillStore function per DTO type. Or use inheritence to share
    // properties among DTOs - look at the example in dtos.ts
    wikiStore.projects.projectDTO = response.project;
    wikiStore.layers.updateFromDTO(response.layers)  // respone.layers should be LayersDTO, instead of casting

    if ((response as GetProjectResponseDTO).yamlContent) {
      wikiStore.yaml.yamlContent = (response as GetProjectResponseDTO).yamlContent;
    }

    if ((response as GetProjectResponseDTO).table) {
      wikiStore.table.table = (response as GetProjectResponseDTO).table;
    }

    if ((response as CallWikifierServiceDTO).wikifierError) {
      wikiStore.wikifier.wikifierError = (response as CallWikifierServiceDTO).wikifierError;
    }

    if ((response as UploadEntitiesDTO).entitiesStats) {
      wikiStore.entitiesStats = (response as UploadEntitiesDTO).entitiesStats;
    }
  }
}

export default RequestService;
