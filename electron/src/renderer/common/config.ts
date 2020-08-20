import { AppConfig, Mode, Platform } from '@/shared/config';
import { ipcRenderer } from 'electron';

class Config implements AppConfig {
    public readonly mode: Mode;
    public readonly platform: Platform;
    public readonly version: string;
    public readonly backend: string;
    public readonly defaultSparqlEndpoint: string;

    constructor() {
        const config = ipcRenderer.sendSync('get-config') as AppConfig;
        console.debug('Config constructor got config: ', config);
        
        this.mode = config.mode;
        this.platform = config.platform;
        this.version = config.version;
        this.backend = config.backend;
        this.defaultSparqlEndpoint = config.defaultSparqlEndpoint;
    }
}

const config = new Config();

export default config;

