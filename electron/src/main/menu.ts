// Manage the main menu
import { BrowserWindow, Menu, MenuItemConstructorOptions, dialog } from 'electron';

import { ConfigManager } from './config';

const config = new ConfigManager();

export default class MainMenuManager {
    constructor(private mainWindow: BrowserWindow) { }

    // Main menu adapted from https://www.electronjs.org/docs/api/menu

    buildMainMenu() {
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
                    { label: 'Open Recent', submenu: [] },
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

    /* Menu event handlers */
    onNewProjectClick() {
        const folders = dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project Folder",
                properties: ['openDirectory', 'createDirectory']
            });

        if (folders) {
            this.mainWindow!.webContents.send('new-project', folders[0]);
        }
    }

    onOpenProjectClick() {
        const folders = dialog.showOpenDialog( this.mainWindow!, {
                title: "Open Project Folder",
                properties: ['openDirectory']
            });

        if (folders) {
            this.mainWindow!.webContents.send('open-project', folders[0]);
        }
    }

    // For later:
    // Keep the recently open submenu in a property that can be updated
    // Fill the recently open submenu from the settings
    // In main.ts, listen to the 'show-project' event, update the settings and the menu
}