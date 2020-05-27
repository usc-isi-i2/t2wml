import { backendGet, backendPost, backendPut, backendDelete } from './comm';

// I did it as a class because we will add a state instance

class RequestService {

  public async getUserInfo() {
    const response = await backendGet('/userinfo');
    return response;
  }

  public async logout() {
    const response = await backendPost('/logout');
    return response;
  }

  public async login(formData: any) {
    const response = await backendPost('/login', formData);
    return response;
  }

  public async getProjects() {
    const response = await backendGet('/user/projects');
    return response;
  }

  public async createProject(formData: any) {
    const response = await backendPost('/project', formData);
    return response;
  }

  public async uploadProperties(formData: any) {
    const response = await backendPost('/properties', formData);
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

  public async download(pid: string, fileType: string) {
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
    const response = await backendPut(`/project/${pid}/sparql`, formData);
    return response;
  }

  // It doesn't exist in the backend 
  public async downloadProject(pid: string) {
    const response = await backendGet(`/project/${pid}/download`);
    return response;
  }

}

export default RequestService;
