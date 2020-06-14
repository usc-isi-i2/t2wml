import { observable, computed } from 'mobx';

class ProjectState {
    @observable public pid: string;

    constructor() {
        this.pid = '';
    }
}

class WikiStore {
    @observable public project = new ProjectState();
}


const wikiStore = new WikiStore();
export default wikiStore;
