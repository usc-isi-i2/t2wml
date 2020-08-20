/* Config object, for use in both rendered and main */

export type Mode = 'prod' | 'dev';
export type Platform = 'windows' | 'mac' | 'linux'; 
import { ipcRenderer } from 'electron';

export interface AppConfig {
    mode: Mode;
    platform: Platform;
    version: string;
    backend: string;
    defaultSparqlEndpoint: string;
}

class ConfigConsumer implements AppConfig {
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

const config = new ConfigConsumer();

export default config;

