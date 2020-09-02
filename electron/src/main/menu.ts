// Manage the main menu
import { BrowserWindow, Menu, MenuItemConstructorOptions, dialog } from 'electron';

import { ConfigManager } from './config';

const config = new ConfigManager();

export default class MainMenuManager {
    private recentlyUsed: MenuItemConstructorOptions[] = []; // todo- get values

    // TODO: pass the settings
    constructor(private mainWindow: BrowserWindow) { }

    public setMainMenu() {
        const menu = this.buildMainMenu();
        Menu.setApplicationMenu(menu);
    }

    private buildMainMenu() {
        const macAppleMenu: MenuItemConstructorOptions = {
            label: 't2wml',
            submenu: [
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        };
        
        this.fillRecentlyUsed();
        const mainMenuTemplate: MenuItemConstructorOptions[] = [
            {
                label: 'File',
                submenu: [
                    { label: 'New Project...', accelerator: 'CmdOrCtrl+N', click: this.onNewProjectClick.bind(this) },
                    { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: this.onOpenProjectClick.bind(this) },
                    { type: 'separator'},
                    { label: 'Open Recent', submenu: this.recentlyUsed },  // Move the 
                    { type: 'separator'},
                    config.platform === 'mac' ? { role: 'close' } : { role: 'quit' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'zoomin' },
                    { role: 'zoomout' },
                    { role: 'resetzoom' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Debug',
                submenu: [
                    { role: 'reload' },
                    { role: 'forcereload' },
                    { role: 'toggledevtools' },
                ]
            },
        ]

        if (config.platform === 'mac') {
            mainMenuTemplate.unshift(macAppleMenu);
        }

        const menu = Menu.buildFromTemplate(mainMenuTemplate);
        return menu;
    }

    private fillRecentlyUsed() {
        // Create the following item for each renctlyused entry:
        // label is the path, click event calls onOpenRecentProjectClick with one argument - the path
        //
        // After all the entries, add a separator ({ type: 'separator' }) and one last entry: 
        // Clear Recently Opened which will call onClearRecentlyOpened()
    }

    private onNewProjectClick() {
        const folders = dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project Folder",
                properties: ['openDirectory', 'createDirectory']
            });

        if (folders) {
            this.mainWindow!.webContents.send('new-project', folders[0]);
        }
    }

    private onOpenProjectClick() {
        const folders = dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project Folder",
                properties: ['openDirectory']
            });

        if (folders) {
            this.mainWindow!.webContents.send('open-project', folders[0]);
        }
    }

    private onOpenRecentProjectClick(folder: string) {
        this.mainWindow!.webContents.send('open-project', folder);
    }

    private onClearRecentlyOpenedClick() {
        // Clear the settings recently used, save and rebuild the menu.
    }

    // For later:
    // Fill the recently open submenu from the settings
}