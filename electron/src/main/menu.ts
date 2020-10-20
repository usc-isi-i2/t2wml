// Manage the main menu
import { BrowserWindow, Menu, MenuItemConstructorOptions, dialog } from 'electron';

import { config } from './config';
import { settings } from './settings';
import { uiState } from './ui-state';
import { rendererNotifier } from './renderer-notifier';
import * as path from 'path';

export default class MainMenuManager {
    private recentlyUsed: MenuItemConstructorOptions[] = [];
    private projectSubMenu: MenuItemConstructorOptions[] = [];

    constructor(private mainWindow: BrowserWindow) { }

    public setMainMenu() {
        this.fillRecentlyUsed();
        this.fillProjectSubMenu();
        const menu = this.buildMainMenu();
        Menu.setApplicationMenu(menu);
    }

    private buildMainMenu() {
        const macAppleMenu: MenuItemConstructorOptions = {
            label: 't2wml',
            submenu: [
                { role: 'hide' },
                { role: 'hideOthers' },
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
                submenu: this.projectSubMenu,
            },
            {
                label: 'View',
                submenu: [
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { role: 'resetZoom' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Debug',
                submenu: [{
                  label: 'Reload App',
                  accelerator: config.platform === 'mac' ? 'Cmd+Shift+R' : 'F12',
                  click: () => this.onReloadAppClick(),
                }, {
                  role: 'toggleDevTools',
                }]
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
        for (const path of settings.recentlyUsed.slice(0, 8)) {  // At most 8 recently used
            subMenu.push({ label: path, click: this.onOpenRecentProjectClick.bind(this, path) });
        }

        const enabled = settings.recentlyUsed.length > 0;
        subMenu = [
            ...subMenu,
            { type: 'separator' },
            { label: 'Clear Recently Opened',
              click: this.onClearRecentlyOpenedClick.bind(this),
              enabled }
        ];

        this.recentlyUsed = subMenu as MenuItemConstructorOptions[];
    }

    private fillProjectSubMenu() {
        const enabled = uiState.displayMode === 'project';
        this.projectSubMenu = [{
            label: 'Refresh',
            accelerator: config.platform === 'mac' ? 'Cmd+R' : 'F5',
            click: () => this.onRefreshProjectClick(),
            enabled,
        }, {
            label: 'Settings...',
            click: () => this.onProjectSettingsClick(),
            enabled,
        }];
    }

    public async onNewProjectClick() {
        const result = await dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project Folder",
                properties: ['openDirectory', 'createDirectory']
            });

        if (!result.canceled && result.filePaths) {
            rendererNotifier.newProject(result.filePaths[0]);
        }
    }

    public async onOpenProjectClick() {
        const result = await dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project File",
                filters: [
                    { name: "t2wml", extensions: ["t2wml"] }
                ],
                properties: ['openFile']
            });

        if (!result.canceled && result.filePaths) {
            const index = result.filePaths[0].lastIndexOf(path.sep);
            const folder =  result.filePaths[0].substring(0, index);
            rendererNotifier.openProject(folder);
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

    private onProjectSettingsClick() {
        rendererNotifier.projectSettings();
    }

    private onClearRecentlyOpenedClick() {
        settings.recentlyUsed = [];
        settings.saveSettings();
        this.setMainMenu();
    }
}
