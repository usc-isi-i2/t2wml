// Manage the main menu
import { BrowserWindow, Menu, MenuItemConstructorOptions, dialog } from 'electron';

import { config } from './config';
import { settings } from './settings';
import { uiState } from './ui-state';
import { rendererNotifier } from './renderer-notifier';

export default class MainMenuManager {
    private recentlyUsed: MenuItemConstructorOptions[] = [];

    constructor(private mainWindow: BrowserWindow) { }

    public setMainMenu() {
        this.fillRecentlyUsed();
        const menu = this.buildMainMenu();
        Menu.setApplicationMenu(menu);
        this.updateProjectMenu();
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
        
        const mainMenuTemplate: MenuItemConstructorOptions[] = [
            {
                label: 'File',
                submenu: [
                    { label: 'New Project...', accelerator: 'CmdOrCtrl+N', click: this.onNewProjectClick.bind(this) },
                    { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: this.onOpenProjectClick.bind(this) },
                    { type: 'separator'},
                    { label: 'Open Recent', submenu: this.recentlyUsed },
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
                label: 'Project',
                submenu: [{ 
                    label: 'Refresh', 
                    accelerator: config.platform === 'mac' ? 'Cmd+R' : 'F5',
                    click: () => this.onRefreshProjectClick(),
                    id: 'PROJECT_REFRESH',
                }]
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
                    { label: 'Reload App', click: () => this.onReloadAppClick() },
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
        let subMenu = [];
        for (const path of settings.recentlyUsed) {
            subMenu.push({ label: path, click: this.onOpenRecentProjectClick.bind(this, path) });
        }
        subMenu = [
            ...subMenu,
            { type: 'separator' },
            { label: 'Clear Recently Opened', click: this.onClearRecentlyOpenedClick.bind(this) }
        ];

        this.recentlyUsed = subMenu as MenuItemConstructorOptions[];
    }

    private updateProjectMenu() {
        const refreshItem = Menu.getApplicationMenu()?.getMenuItemById('PROJECT_REFRESH');
        if (!refreshItem) {
            console.warn("Can't find the Project|Refresh menu item");
        } else {
            refreshItem.enabled = uiState.displayMode === 'project';
            console.log('Updating refresh project to ', refreshItem.enabled);
        }
    }

    public onNewProjectClick() {
        const folders = dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project Folder",
                properties: ['openDirectory', 'createDirectory']
            });

        if (folders) {
            rendererNotifier.newProject(folders[0]);
        }
    }

    public onOpenProjectClick() {
        const files = dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project File",
                filters: [
                    { name: "t2wmlproj", extensions: ["t2wmlproj"] }
                ],
                properties: ['openFile']
            });

        if (files) {
            const index = files[0].lastIndexOf('\\');
            const path =  files[0].substring(0, index);
            rendererNotifier.openProject(path);
        }
    }

    private onOpenRecentProjectClick(folder: string) {
        rendererNotifier.openProject(folder);
    }

    private onReloadAppClick() {
        this.mainWindow!.webContents.reloadIgnoringCache();
    }

    private onRefreshProjectClick() {
        rendererNotifier.refreshProject();
    }

    private onClearRecentlyOpenedClick() {
        settings.recentlyUsed = [];
        settings.saveSettings();
        this.setMainMenu();
    }
}
