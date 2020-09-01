// Manage the main menu

import { BrowserWindow } from "electron";

export default class MainMenuManager {
    constructor(private mainMenu: BrowserWindow) { }

    // TODO:
    // 1. Move the buildMainMenu function from main.ts here
    // 2. Create a MainMenuManager in main.ts after creatng the main window
    // 3. Move the newProject and openProject event handlers here.
    // 4. Call this.buildMainMenu from main.ts

    // For later:
    // Keep the recently open submenu in a property that can be updated
    // Fill the recently open submenu from the settings
    // In main.ts, listen to the 'show-project' event, update the settings and the menu
}