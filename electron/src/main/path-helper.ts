import { config } from './config';
import { app, BrowserWindow, dialog } from 'electron';
import axios from 'axios';
import { MessageBoxOptions } from 'electron/main';
import * as path from 'path';
import * as child_process from 'child_process';

export async function addToPath() {
    if (config.platform === 'windows') {
        addToWindowsPath();
    } else if (config.platform === 'mac') {
        addToMacPath();
    } else if (config.platform === 'linux') {
        addToLinuxPath();
    }
}

async function addToWindowsPath() {
    // In Windows, we need to update the registry, which is done by calling the backend. This is because the
    // Node package windows-registry doesn't support node versions higher than 10.
    const exe = app.getPath('exe')
    const dir = path.dirname(exe);
    const url = `${config.backend}api/windows/add-to-path?path=${dir}`;

    console.log('Adding ' + dir + ' to path');
    await axios.post(url);
    showMessageBox();
}

async function promiseFromChildProcess(child: child_process.ChildProcess) {
    // Taken from https://stackoverflow.com/a/30883005/871910
    return new Promise(function (resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", resolve);
    });
}

async function addToMacPath() {
    // Taken from the VS Code source
    const helperPathname = path.join(process.resourcesPath || __dirname, 't2wml-on-mac.sh');
    console.log('Helper script at ', helperPathname);

    const command = 'osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'' + helperPathname + '\' \'/usr/local/bin/t2wml\' && chmod ugo+x \'' + helperPathname + '\'\\" with administrator privileges"';
    console.log(command);
    const child = child_process.exec(command);
    await promiseFromChildProcess(child)
    console.log('Added link to helper')

    showMessageBox();
}

function addToLinuxPath() {
    // Add to Linux path
}

function showMessageBox(details?: string) {
    const options: MessageBoxOptions = {
        type: 'info',
        title: 'Add t2wml to path',
        message: 't2wml added to path',
        detail: details,
    }

    dialog.showMessageBox(null as unknown as BrowserWindow, options);
}