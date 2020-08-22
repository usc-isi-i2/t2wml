/*
 * The App wide configuration
 */

import { AppConfig, Mode, Platform } from '@/shared/config';
import { ipcMain } from 'electron';

// eslint-disable-next-line
const packageJson = require('../../package.json');  // Couldn't figure out how to import package.json, so resorting to require

export class ConfigManager implements AppConfig {
    public mode: Mode;
    public platform: Platform;
    public version: string;
    public backend: string;
    public defaultSparqlEndpoint: string;

    constructor() {
        this.mode = (process.env.NODE_ENV === 'production') ? 'prod' : 'dev';

        if (process.platform === 'win32') {
            this.platform = 'windows';
        } else if (process.platform === 'darwin') {
            this.platform = 'mac';
        } else {
            this.platform = 'linux';
        }

        this.version = packageJson.version;

        if (this.mode === 'dev') {
            this.version += ' (dev)';
        }
        
        this.backend = 'http://localhost:13000/';
        this.defaultSparqlEndpoint ="https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql"

        ipcMain.on('get-config', (event: any) => this.getConfig(event));
    }

    private getConfig(event: any) {
        event.returnValue = this;
    }
}