/* Config object, for use in both rendered and main */

export type Mode = 'prod' | 'dev';
export type Platform = 'windows' | 'mac' | 'linux'; 

export interface AppConfig {
    mode: Mode;
    platform: Platform;
    version: string;
    backend: string;
    defaultSparqlEndpoint: string;
}
