import { observable, computed } from 'mobx';

class ProjectState {
    @observable public pid: string;

    constructor() {
        this.pid = '';
    }
}

type EditorsStatus = "Wikifier" | "YamlEditor";
class EditorsState {
    @observable public nowShowing: EditorsStatus = "Wikifier";
}

class TabletState {
    @observable public isCellSelectable: boolean;

    constructor() {
        this.isCellSelectable = false;
    }
}

class SettingsState {
    @observable public sparqlEndpoint: string;

    constructor() {
        this.sparqlEndpoint = '';
    }
}

class WikifierInnerState {
    @observable public qnodeData: any = null;
    @observable public currRegion: string = ''; // Is it needed?
}
class WikifierState {
    @observable public showSpinner: boolean;
    // @observable public updateWikifier: () => void;
    @observable public state: WikifierInnerState | undefined;
    @observable public scope: number; // Is it needed?

    constructor() {
        this.showSpinner = false;
        // this.updateWikifier = () => {};
        this.state = new WikifierInnerState();
        this.scope = 0;
    }
}

class WikiStore {
    @observable public project = new ProjectState();
    @observable public editors = new EditorsState();
    @observable public table = new TabletState();
    @observable public settings = new SettingsState();
    @observable public wikifier = new WikifierState();
}


const wikiStore = new WikiStore();
export default wikiStore;
