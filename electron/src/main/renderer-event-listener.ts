/* The RendererEvents class is the only class that listens to events coming in from the renderer */

import { ipcMain } from 'electron';
import { EventEmitter } from 'events';
import { settings } from './settings';
import { config } from './config';
import { uiState } from './ui-state';
import MainMenuManager from './menu';

export class RendererEventListener {
 
    public constructor(public mainMenuManager?: MainMenuManager) {
        ipcMain.on('get-config', (event: any) => this.handleGetConfig(event));
        ipcMain.on('show-project', (sender: EventEmitter, folder: string) => this.handleShowProject(folder));
        ipcMain.on('new-project', () => this.handleNewProject());
        ipcMain.on('open-project', () => this.handleOpenProject());
    }

    private handleGetConfig(event: any) {
        event.returnValue = config;
    }

    private handleShowProject(folder: string) {
        if (folder) {
            settings.addRecentlyUsed(folder);
        }
        uiState.displayMode = folder ? 'project' : 'project-list';
        if (!this.mainMenuManager) {
            console.warn('show-project event received before mainMainManager set in listener');
        } else {
            this.mainMenuManager.setMainMenu();
        }
    }

    private handleNewProject() {
        this.mainMenuManager?.onNewProjectClick();
    }

    private handleOpenProject() {
        this.mainMenuManager?.onOpenProjectClick();
    }
}