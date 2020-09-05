/* The RendererEvents class is the only class that listens to events coming in from the renderer */

import { ipcMain } from 'electron';
import { EventEmitter } from 'events';
import { settings } from './settings';
import { config } from './config';
import MainMenuManager from './menu';

export class RendererEventListener {
 
    public constructor(public mainMenuManager?: MainMenuManager) {
        ipcMain.on('get-config', (event: any) => this.handleGetConfig(event));
        ipcMain.on('show-project', (sender: EventEmitter, folder: string) => this.handleShowProject(folder));
    }

    private handleGetConfig(event: any) {
        event.returnValue = config;
    }

    private handleShowProject(folder: string) {
        settings.addRecentlyUsed(folder);
        if (!this.mainMenuManager) {
            console.warn('show-project event received before mainMainManager set in listener');
        } else {
            this.mainMenuManager.setMainMenu();
        }
    }
}