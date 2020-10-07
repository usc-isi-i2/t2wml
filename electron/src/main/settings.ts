// The App's settings
import * as os from 'os';
import * as fs from 'fs';
import { BrowserWindow } from 'electron';

interface WindowSettings {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maximized: boolean;
}

interface DevSettings {
    devToolsOpen: boolean;
}

interface AppSettings {
    recentlyUsed: string[];
    window: WindowSettings;
    dev: DevSettings;
}

// Settings stored here 
const file = `${os.homedir()}/.t2wml/gui-settings.json`;

export class Settings implements AppSettings {
    private static _instance?: Settings
    public static get instance() {
        if (!Settings._instance) {
            Settings._instance = new Settings();
        }

        return Settings._instance;
    }

    recentlyUsed: string[] = [];
    window: WindowSettings = { width: 1000, height: 700, maximized: false }
    dev: DevSettings = { devToolsOpen: false };

    private constructor() {
        try {
            const content = fs.readFileSync(file, {encoding: 'utf8'});
            if (content) {
                const contentObj: any = JSON.parse(content);
                if (contentObj.recentlyUsed) {
                    this.recentlyUsed = contentObj.recentlyUsed;
                }

                if (contentObj.window) {
                    this.window = contentObj.window;
                }

                if (contentObj.dev) {
                    this.dev = contentObj.dev;
                }
            }
        } catch {
            // If the file doen't exist, don't change the defaults
        }
    }

    saveSettings() {
        fs.writeFileSync(file, JSON.stringify({
            recentlyUsed: this.recentlyUsed,
            window: this.window,
            dev: this.dev,
        }));
    }

    addRecentlyUsed(folder: string) {
        const index = this.recentlyUsed.indexOf(folder);
        if (index > -1) {
            this.recentlyUsed.splice(index, 1);
        }
        this.recentlyUsed.unshift(folder);

        this.saveSettings();
    }

    removeProjectFromList(folder: string) {
        const index = this.recentlyUsed.indexOf(folder);
        if (index > -1) {
            this.recentlyUsed.splice(index, 1);
            this.saveSettings();
        }
    }

    updateSettingsFromWindow(mainWindow: BrowserWindow) {  
        this.window.maximized = mainWindow.isMaximized();
        const bounds = mainWindow.getNormalBounds();

        this.window.x = bounds.x;
        this.window.y = bounds.y;
        this.window.width = bounds.width;
        this.window.height = bounds.height;

        this.dev.devToolsOpen = mainWindow.webContents.isDevToolsOpened();

        this.saveSettings();
    }
}

export const settings = Settings.instance;