/**
 * Entry point of the Election app.
 */
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
import treeKill from 'tree-kill';
import * as fs from 'fs';

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { config } from './config';
import MainMenuManager from './menu';
import { RendererEventListener } from './renderer-event-listener';
import { rendererNotifier } from './renderer-notifier';
import { settings } from './settings';

/* Splash Screen */
let splashWindow: Electron.BrowserWindow | null;

function openSplashScreen(): void {
    splashWindow = new BrowserWindow({
        height: 300,
        width: 400,
        show: false,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            worldSafeExecuteJavaScript: true,
        }
    });

    splashWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, './splash.html'),
            protocol: 'file:',
            slashes: true,
        })
    );

    splashWindow.once('ready-to-show', () => {
        splashWindow!.show();
    });
}

/* Main Window */
let mainWindow: Electron.BrowserWindow | null;
let mainMenuManager: MainMenuManager | null;
const rendererEventListener = new RendererEventListener(); // Used by splash-screen and main window

function createMainWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        x: settings.window.x,
        y: settings.window.y,
        height: settings.window.height,
        width: settings.window.width,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            worldSafeExecuteJavaScript: true,
        }
    });
    
    // and load the index.html of the app.
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, './index.html'),
            protocol: 'file:',
            slashes: true,
        })
    );

    mainMenuManager = new MainMenuManager(mainWindow!);
    mainMenuManager!.setMainMenu();
    rendererEventListener.mainMenuManager = mainMenuManager;
    rendererNotifier.mainWindow = mainWindow;

    mainWindow.once('ready-to-show', () => {
        mainWindow!.show();

        if (splashWindow) {
            // On a Mac, the main window can be opened several times. There is
            // no splash window in subsequent openings of the main window.
            splashWindow.close();
            splashWindow = null;
        }

        if (settings.window.maximized) {
            mainWindow!.maximize();
        }

        if (settings.dev.devToolsOpen && config.mode === 'dev') {
            // In prod, dev tools never open automatically
            mainWindow!.webContents.openDevTools();
        }
    });
    
    mainWindow.once('close', () => {
        settings.updateSettingsFromWindow(mainWindow!);
    });

    // Emitted when the window is closed.
    mainWindow.once('closed', () => {
        mainWindow = null;
    });
}


/* Backend Initialization */
let backendProcess: ChildProcess | null;

function getBackendPath() {
    let filename = 't2wml-server';
    if (config.platform === 'windows') {
        filename = 't2wml-server.exe';
    }

    let pathname = path.join(process.resourcesPath || __dirname, filename);
    if (fs.existsSync(pathname)) {
        return pathname;
    }
    console.warn(`Can't find embedded server at ${pathname}, looking for external one`);
    pathname = path.join(__dirname, '..', '..', 'backend', 'dist', filename);

    if (!fs.existsSync(pathname)) {
        console.error(`Can't find any server, even not at ${pathname}`);
        return null;
    }

    return pathname;
}

function initBackend() {
    if (config.mode === 'dev') {
        console.log(`DEV MODE - start the backend yourself on ${config.backend}`);
        return;
    }

    const port = Math.floor(Math.random() * 20000) + 40000  // Choose a random port between 40000 and 60000
    // const port = 13000; // For now the frontend expects the backend to be on port 13000
    const backendPath = getBackendPath();

    if (!backendPath) {
        console.error('No t2wml without a backend');
        app.quit();
        return;
    }

    config.backend = `http://localhost:${port}/`;

    console.log(`Spawning backend from ${backendPath}, on port ${port}`);
    try {
        backendProcess = spawn(backendPath, [port.toString()]);
    } catch(err) {
        console.error("Can't run backend: ", err);
        app.quit();
    }
}

async function waitForBackend() {
    const url = `${config.backend}api/is-alive`;

    console.log(`Waiting for backend at ${url}...`);
    for(let retryCount=0; retryCount < 120; retryCount++) {
        // Try accessing the backend, see if we get a response
        try {
            await axios.get(url);
            console.log(`Backend is ready`);
            return;
        } catch(error) {
            await sleep(500); // Wait a bit before trying again
        }
    }

    console.error('Backend is not responding, quitting');
    app.quit();
}

/* Utilities */
async function sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

/* App Initilization */
async function initApp(): Promise<void> {
    openSplashScreen();
    initBackend();
    await waitForBackend();
    
    createMainWindow();  // Will close the splash window
}

if (config.mode !== 'prod') {
    app.commandLine.appendSwitch('remote-debugging-port', '9223');
    app.commandLine.appendSwitch('enable-logging');
}

app.once('ready', initApp);

app.on('window-all-closed', async () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (config.platform !== 'mac') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createMainWindow();
    }
});


/* Shutting down */
app.on('will-quit', (event) => {
    if (backendProcess) {
        console.log('Killing backend process');

        // Killing the backend process takes a little while, we have to
        // wait until it's done before actually quitting, or else on Windows
        // we'll be left with stray server instances.
        treeKill(backendProcess.pid, () => {
            backendProcess = null;
            app.quit();  // Quit for real
        });
        // Prevent quitting until callback is called
        event.preventDefault(); 
    }
});

app.on('quit', () => {
    console.log('t2wml is done');
})
