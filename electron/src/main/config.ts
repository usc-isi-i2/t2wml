/*
 * The App wide configuration
 */

import { AppConfig, Mode, Platform } from '@/shared/config';

// eslint-disable-next-line
const packageJson = require('../../package.json');  // Couldn't figure out how to import package.json, so resorting to require

export class ConfigManager implements AppConfig {
    private static _instance?: ConfigManager;

    public static get instance() {
        if (!ConfigManager._instance) {
            ConfigManager._instance = new ConfigManager();
        }

        return ConfigManager._instance;
    }

    public mode: Mode;
    public platform: Platform;
    public version: string;
    public backend: string;
    public defaultSparqlEndpoint: string;

    private constructor() {
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
            this.version = '(dev)';
        }
        
        this.backend = 'http://localhost:13000/';
        this.defaultSparqlEndpoint ="https://dsbox02.isi.edu:8888/bigdata/namespace/wdq/sparql"
    }
}

export const config = ConfigManager.instance;