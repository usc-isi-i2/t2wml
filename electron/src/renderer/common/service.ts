import wikiStore from '../data/store';
import { backendGet, backendPost, backendPut } from './comm';
import { GetProjectResponseDTO, ProjectDTO, UploadDataFileResponseDTO, UploadWikifierOutputResponseDTO, ResponseWithProjectDTO,
  UploadYamlResponseDTO, UploadEntitiesDTO, CallWikifierServiceDTO, TableDTO, LayersDTO, ChangeSheetResponseDTO, ResponseWithLayersDTO, ChangeDataFileResponseDTO } from './dtos';
import { Cell } from './general';

// I did it as a class because we will add a state instance

class RequestService {

  public async createProject(folder: string) {
    const response = await backendPost(`/project?project_folder=${folder}`) as ResponseWithProjectDTO;
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

  public async changeDataFile(dataFileName: string, folder: string) {
    const response = await backendGet(`/data/change_data_file?data_file=${dataFileName}&project_folder=${folder}`) as ChangeDataFileResponseDTO;
    this.fillChangeDataFile(response);
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
    const response = await backendPost(`/wikifier_service?project_folder=${folder}`, formData) as CallWikifierServiceDTO;
    this.fillCallWikifier(response);
  }

  public async getProject(folder: string) {
    const response = await backendGet(`/project?project_folder=${folder}`) as GetProjectResponseDTO;
    this.fillgetProjectData(response);
  }

  public async renameProject(folder: string, formData: any) {
    //returns project
    const response = await backendPut(`/project?project_folder=${folder}`, formData) as ResponseWithProjectDTO;
    this.fillProjectInStore(response.project); // not necessary
  }

  public async getSettings(folder: string, formData: any) {
    //returns endpoint, warnEmpty
    const response = await backendPut(`/project/settings?project_folder=${folder}`, formData) as ResponseWithProjectDTO;
    this.fillProjectInStore(response.project);
  }

  public async uploadEntities(folder: string, formData: any) {
    const response = await backendPost(`/project/entity?project_folder=${folder}`, formData) as UploadEntitiesDTO;
    this.fillEntitiesData(response);
  }
  
  public async loadToDatamart(folder: string) {
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

  public fillChangeDataFile(response: ChangeDataFileResponseDTO) {
    this.fillTableInStore(response.table);
    this.fillLayersInStore(response.layers);
    this.fillYamlContentInStore(response.yamlContent);
    
    // don't change project when changing file in file tree
    wikiStore.projects.projectDTO!._saved_state = response.project._saved_state;
    // clear output window
    wikiStore.table.selectedCell = new Cell('', 0, '');
  }
}

export default RequestService;
