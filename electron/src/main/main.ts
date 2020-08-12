/**
 * Entry point of the Election app.
 */
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as treeKill from 'tree-kill';

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

let mainWindow: Electron.BrowserWindow | null;
let splashWindow: Electron.BrowserWindow | null;
let backendProcess: ChildProcess | null;

let backendUrl = '';

function isProd() {
    return process.env.NODE_ENV === 'production';
}

function isMac() {
    return process.platform === 'darwin';
}

function isWindows() {
    return process.platform === 'win32';
}

if (!isProd()) {
    app.commandLine.appendSwitch('remote-debugging-port', '9223');
    app.commandLine.appendSwitch('enable-logging');
}

function openSplashScreen(): void {
    splashWindow = new BrowserWindow({
        height: 600,
        width: 800,
        show: false,
        webPreferences: {
            webSecurity: false,
        },
        frame: false,
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

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        show: false,
    });

    // and load the index.html of the app.
    mainWindow.loadURL('http://localhost:13000');  // TODO: Add random port

    // TODO: Switch to the local app instead of the one served by Flask
    //     url.format({
    //         pathname: path.join(__dirname, './index.html'),
    //         protocol: 'file:',
    //         slashes: true
    //     })
    // );

    mainWindow.webContents.openDevTools()

    mainWindow.once('ready-to-show', () => {
        mainWindow!.show();
        splashWindow!.close();
        splashWindow = null;
    });
    
    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function getBackendPath() {
    let filename = 't2wml-server';
    if (isWindows()) {
        filename = 't2wml-server.exe';
    }
    if (isProd()) {
        return path.join(process.resourcesPath || __dirname, filename);
    }
    return path.join(__dirname, '..', '..', 'backend', 'dist', filename);
}

async function sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

async function initBackend(): Promise<void> {
    const backendPath = getBackendPath();
    console.log('Spawning backend from ', backendPath);
    try {
        backendProcess = spawn(backendPath);
        console.log('Backend spawned: ', backendProcess.pid);
    } catch(err) {
        console.error("Can't run backend: ", err);
        app.quit();
        return;
    }

    backendUrl = 'http://localhost:13000'; // TODO: Choose a random port
    for(let retryCount=0; retryCount < 30; retryCount++) {
        // Try accessing the backend, see if we get a response
        try {
            await axios.get(`${backendUrl}/api/is-alive`);
            console.log('Backend is ready');
            return;
        } catch(error) {
            await sleep(500); // Wait a bit before trying again
        }
    }

    console.error("Can't open backend");
    app.quit();
}

async function initApp(): Promise<void> {
    openSplashScreen();
    await initBackend();
    
    createWindow();  // WIll close the splash window
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.once('ready', initApp);

// Quit when all windows are closed.
app.on('window-all-closed', async () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isMac()) {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('will-quit', (event) => {
    if (backendProcess) {
        console.log('Killing child process');

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
