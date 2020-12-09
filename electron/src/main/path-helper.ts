import { config } from './config';
import { app, BrowserWindow, dialog } from 'electron';
import axios from 'axios';
import { MessageBoxOptions } from 'electron/main';
import * as path from 'path';

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

function addToMacPath() {
    // Add to Mac path
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