/**
 * Entry point of the Election app.
 */
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: Electron.BrowserWindow | null;
let backendProcess: ChildProcess | null;

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

function createWindow(): void {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        show: false,
        webPreferences: {
            webSecurity: false,
            devTools: !isProd(),
        }
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
    });
    
    // Emitted when the window is closed.
    mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
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

function initApp(): void {
    const backendPath = getBackendPath();
    console.log('Spawning backend in ', backendPath);
    try {
        backendProcess = spawn(backendPath);
    } catch(err) {
        console.error("Can't run backend: ", err);
        app.quit();
        return;
    }

    // TODO: Wait for backend to respond
    
    createWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.once('ready', initApp);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
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

app.on('quit', () => {
    console.log('Application quitting');
    if (backendProcess) {
        console.log('Killing child process');
        backendProcess.kill('SIGTERM');
    }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
