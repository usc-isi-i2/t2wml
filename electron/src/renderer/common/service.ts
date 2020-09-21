import { backendGet, backendPost, backendPut, backendDelete } from './comm';

// I did it as a class because we will add a state instance

class RequestService {

  public async logout() {
    const response = await backendPost('/logout');
    return response;
  }

  public async getProjects() {
    const response = await backendGet('/projects');
    return response;
  }

  public async createProject(folder: string) {
    const response = await backendPost(`/project?project_folder=${folder}`);
    return response;
  }

  public async loadProject(folder: string) {
    const response = await backendPost(`/project/load?project_folder=${folder}`);
    return response;
  }

  public async uploadProperties(folder: string, formData: any) {
    const response = await backendPost(`/project/properties?project_folder=${folder}`, formData);
    return response;
  }

  public async uploadDataFile(folder: string, formData: any) {
    const response = await backendPost(`/data?project_folder=${folder}`, formData);
    return response;
  }

  public async changeSheet(folder: string, sheetName: string) {
    const response = await backendGet(`/data/${sheetName}?project_folder=${folder}`);
    return response;
  }

  public async uploadWikifierOutput(folder: string, formData: any) {
    const response = await backendPost(`/wikifier?project_folder=${folder}`, formData);
    return response;
  }

  public async uploadYaml(folder: string, formData: any) {
    const response = await backendPost(`/yaml?project_folder=${folder}`, formData);
    return response;
  }

  public async resolveCell(folder: string, row: string, col: string) {
    const response = await backendGet(`/data/cell/${row}/${col}?project_folder=${folder}`);
    return response;
  }

  public async downloadResults(folder: string, fileType: string) {
    const response = await backendGet(`/project/download/${fileType}?project_folder=${folder}`);
    return response;
  }

  public async callWikifierService(folder: string, formData: any) {
    const response = await backendPost(`/wikifier_service?project_folder=${folder}`, formData);
    return response;
  }

  public async getProjectFiles(folder: string) {
    const response = await backendGet(`/project?project_folder=${folder}`);
    return response;
  }

  public async deleteProject(folder: string) {
    const response = await backendDelete(`/project?project_folder=${folder}`);
    return response;
  }

  public async renameProject(folder: string, formData: any) {
    const response = await backendPut(`/project?project_folder=${folder}`, formData);
    return response;
  }

  public async updateSettings(folder: string, formData: any) {
    const response = await backendPut(`/project/settings?project_folder=${folder}`, formData);
    return response;
  }

  public async getSettings(folder: string) {
    const response = await backendGet(`/project/settings?project_folder=${folder}`);
    return response;
  }

  // It doesn't exist in the backend 
  public async downloadProject(folder: string) {
    const response = await backendGet(`/project/download?project_folder=${folder}`);
    return response;
  }

  public async getQnode(folder: string, node: string) {
    const response = await backendGet(`/qnode/${node}?project_folder=${folder}`);
    return response;
  }

  public async uploadEntities(folder: string, formData: any) {
    const response = await backendPost(`/project/entity?project_folder=${folder}`, formData);
    return response;
  }
  
  public async loadToDatamart(folder: string) {
    const response = await backendGet(`/project/datamart?project_folder=${folder}`);
    return response;
  }

}

export default RequestService;
