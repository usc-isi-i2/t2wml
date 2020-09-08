import { BrowserWindow } from "electron";

class RendererNotifier {
    private static _instance?: RendererNotifier;
    public static get instance() {
        if (!RendererNotifier._instance) {
            RendererNotifier._instance = new RendererNotifier();
        }
        return RendererNotifier._instance;
    }

    public mainWindow?: BrowserWindow;

    private constructor() {
        // Make sure instances cannot be created by outsiders
    }

    public openProject(folder: string) {
        if(!this.mainWindow) {
            console.warn("mainWindow not set on RendererNotifier");
            return;
        }
        this.mainWindow.webContents.send('open-project', folder);
    }

    public newProject(folder: string) {
        if(!this.mainWindow) {
            console.warn("mainWindow not set on RendererNotifier");
            return;
        }
        this.mainWindow.webContents.send('new-project', folder);
    }

    public refreshProject() {
        if(!this.mainWindow) {
            console.warn("mainWindow not set on RendererNotifier");
            return;
        }
        this.mainWindow.webContents.send('refresh-project');
    }

    public projectSettings() {
        if(!this.mainWindow) {
            console.warn("mainWindow not set on RendererNotifier");
            return;
        }
        this.mainWindow.webContents.send('project-settings');

    }
}

export const rendererNotifier = RendererNotifier.instance;