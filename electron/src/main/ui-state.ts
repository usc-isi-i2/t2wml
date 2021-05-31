import { DisplayMode } from "@/shared/types";

class UIState {
    private static _instance?: UIState;
    public static get instance(): UIState {
        if (!UIState._instance) {
            UIState._instance = new UIState();
        }
        return UIState._instance;
    }

    public displayMode: DisplayMode;
    public showCleanedData: boolean;
    public showQnodes: boolean;

    private constructor() {
        this.displayMode = 'project-list';
        this.showCleanedData = false;
        this.showQnodes = false;
    }
}

export const uiState = UIState.instance;
