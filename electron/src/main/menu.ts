// Manage the main menu
import { BrowserWindow, Menu, MenuItemConstructorOptions, dialog, shell, MessageBoxOptions } from 'electron';

import { config } from './config';
import { settings } from './settings';
import { uiState } from './ui-state';
import { rendererNotifier } from './renderer-notifier';
import * as path from 'path';
import * as url from 'url';
import { addToPath } from './path-helper';
import axios from 'axios';

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
                    { label: 'Preferences', submenu: [
                        {
                            label: 'Global Settings',
                            click: () => this.onGlobalSettingsClick()
                        }
                    ]},
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
                    { role: 'zoomIn', accelerator: 'CommandOrControl+numadd' },
                    { role: 'zoomIn', accelerator: 'CommandOrControl+=', acceleratorWorksWhenHidden: true, visible: false },
                    { role: 'zoomOut' },
                    { role: 'zoomOut', accelerator: 'CommandOrControl+numsub', acceleratorWorksWhenHidden: true, visible: false },
                    { role: 'resetZoom' },
                    { role: 'resetZoom', accelerator: 'CommandOrControl+num0', acceleratorWorksWhenHidden: true, visible: false },
                    { type: 'separator' },
                    { role: 'togglefullscreen' },
                    { type: 'separator' },

                ]
            },
            {
                label: 'Help',
                submenu: [
                    //{ //TODO:
                    //    label: 'Usage Guide',
                    //},
                    {
                        label: 'Syntax Guide',
                        click: () => this.loadGrammar()
                    },
                    {
                        label: 'Report a bug',
                        click: () => shell.openExternal("https://github.com/usc-isi-i2/t2wml/issues/new/choose")
                    },
                    { type: 'separator' },
                    {
                        label: 'Add t2wml to your PATH',
                        click: () => this.onAddToPath(),
                    },
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
                },
                {
                    label: "Check version",
                    click: () => this.showVersion(),
                }]
            }
        ]

        if (config.platform === 'mac') {
            mainMenuTemplate.unshift(macAppleMenu);
        }

        const menu = Menu.buildFromTemplate(mainMenuTemplate);
        return menu;
    }

    private async showVersion(){
        const url = `${config.backend}api/get-version`;
        const a = await axios.get(url);
        const version =a.data;
        const options: MessageBoxOptions = {
            type: 'info',
            title: 'Version info',
            message: 'version 2.9.3-pre-4',
            detail: "t2wml api version "+ version,
        }

        dialog.showMessageBox(null as unknown as BrowserWindow, options);
    }

    private loadGrammar(){
        const child = new BrowserWindow({parent:this.mainWindow});
        const link = url.format({
            protocol: 'file',
            pathname: path.join(__dirname, './grammar.html')
          })
        child.loadURL(link);
        child.show();
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
        //electron will not allow disabling/hiding top level menu item, so we can only disable within the sub menu when not in project
        const enabled = uiState.displayMode === 'project';
        this.projectSubMenu = [{
            label: 'Refresh',
            accelerator: config.platform === 'mac' ? 'Cmd+R' : 'F5',
            click: () => this.onRefreshProjectClick(),
            enabled,
        }, {
            label: 'Settings...',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.onProjectSettingsClick(),
            enabled,
        },
        {
            label: 'Entities',
            click: () => this.onProjectEntitiesClick(),
            enabled,
        },
        {
            label: 'Show Cleaned Data',
            type: 'checkbox',
            checked: uiState.showCleanedData,
            click: (checkbox) => this.onShowCleanedClick(checkbox.checked),
            enabled,
        }
    ];
    }

    public async onNewProjectClick() {
        rendererNotifier.newProject();
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

    private onProjectEntitiesClick() {
        rendererNotifier.projectEntities();
    }

    private onGlobalSettingsClick() {
        rendererNotifier.globalSettings();
    }

    private onClearRecentlyOpenedClick() {
        settings.recentlyUsed = [];
        settings.saveSettings();
        this.setMainMenu();
    }

    private onShowCleanedClick(checked: boolean) {
        rendererNotifier.toggleShowCleanedData(checked);
    }

    private async onAddToPath() {
        await addToPath();
    }
}
