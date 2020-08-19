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

  public async createProject(formData: any) {
    const response = await backendPost('/project', formData);
    return response;
  }

  public async loadProject(formData: any) {
    const response = await backendPost('/project/load', formData);
    return response;
  }

  public async uploadProperties(pid: string, formData: any) {
    const response = await backendPost(`/project/${pid}/properties`, formData);
    return response;
  }

  public async uploadDataFile(pid: string, formData: any) {
    const response = await backendPost(`/data/${pid}`, formData);
    return response;
  }

  public async changeSheet(pid: string, sheetName: string) {
    const response = await backendGet(`/data/${pid}/${sheetName}`);
    return response;
  }

  public async uploadWikifierOutput(pid: string, formData: any) {
    const response = await backendPost(`/wikifier/${pid}`, formData);
    return response;
  }

  public async uploadYaml(pid: string, formData: any) {
    const response = await backendPost(`/yaml/${pid}`, formData);
    return response;
  }

  public async resolveCell(pid: string, row: string, col: string) {
    const response = await backendGet(`/data/${pid}/cell/${row}/${col}`);
    return response;
  }

  public async downloadResults(pid: string, fileType: string) {
    const response = await backendGet(`/project/${pid}/download/${fileType}`);
    return response;
  }

  public async callWikifierService(pid: string, formData: any) {
    const response = await backendPost(`/wikifier_service/${pid}`, formData);
    return response;
  }

  public async getProjectFiles(pid: string) {
    const response = await backendGet(`/project/${pid}`);
    return response;
  }

  public async deleteProject(pid: string) {
    const response = await backendDelete(`/project/${pid}`);
    return response;
  }

  public async renameProject(pid: string, formData: any) {
    const response = await backendPut(`/project/${pid}`, formData);
    return response;
  }

  public async updateSettings(pid: string, formData: any) {
    const response = await backendPut(`/project/${pid}/settings`, formData);
    return response;
  }

  public async getSettings(pid: string) {
    const response = await backendGet(`/project/${pid}/settings`);
    return response;
  }

  // It doesn't exist in the backend 
  public async downloadProject(pid: string) {
    const response = await backendGet(`/project/${pid}/download`);
    return response;
  }

  public async getQnode(pid:string, node: string) {
    const response = await backendGet(`/qnode/${pid}/${node}`);
    return response;
  }

  public async addItemDefinitions(pid: string, formData: any) {
    const response = await backendPost(`/project/${pid}/items`, formData);
    return response;
  }

}

export default RequestService;
