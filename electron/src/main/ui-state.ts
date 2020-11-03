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

    // TODO: Add another parameter indicating whether we see the cleaned or original data.

    private constructor() {
        this.displayMode = 'project-list';
        // Set a default value of cleaned/original
    }
}

export const uiState = UIState.instance;
