import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

export class Project {
    private _folder;
    public get folder() { return this._folder; }
    private _filepath;

    private _yaml: any = { }

    public get name() {
        return this._yaml.title;
    }

    private _created = new Date();
    public get created() { return this._created; }

    private _modified = new Date();
    public get modified() { return this._modified; }

    private _valid = false;
    public get valid() { return this._valid; }  // False if the project doesn't exist

    private constructor(folder: string) {
        this._folder = folder;
        this._filepath = path.join(this.folder, 'project.t2wml');
        // Make sure a Project can only be created from a factory method

        this.readProjectFile();
        this.fillFileDates();
        this.watchProjectFile();
    }

    private readProjectFile() {
        try {
            // Read the yaml file
            const content = fs.readFileSync(this._filepath, 'utf8');
            this._yaml = yaml.safeLoad(content);
        } catch(error) {
            console.error(`Can't load project file ${path}`)
            this._valid = false;
            throw error;
        }
    }

    private fillFileDates() {
        const stats = fs.statSync(this._filepath);
        this._created = stats.ctime;
        this._modified = stats.mtime;
    }

    private watchProjectFile() {
        fs.watch(this._filepath, {
            persistent: false
        }, (event) => this.onProjectFileChanged(event))
    }

    private onProjectFileChanged(eventType: string) {
        console.log(`Project file ${this._filepath} changed: ${eventType}`);
        try {
            this.readProjectFile();
            this.fillFileDates();
        } catch(error) {
            console.warn(`Refreshing file data caused an error: ${error}`);
            this._valid = false;
        }
    }
}