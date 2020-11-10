import { ipcRenderer } from 'electron';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { observable } from 'mobx';
import * as path from 'path';
import { ProjectDTO } from '../common/dtos';

export class Project {
    private _folder: string;
    public get folder() { return this._folder; }
    private _filepath: string;

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

    private _watcher?: fs.FSWatcher;

    public constructor(folder: string) {
        this._folder = folder;
        this._filepath = path.join(this.folder, 'project.t2wml');
        // Make sure a Project can only be created from a factory method

        this.readProjectFile();
        this.fillFileDates();
        this.watchProjectFile();
    }

    public unwatch() {
        if(this._watcher) {
            this._watcher.close();
            this._watcher = undefined;
        }
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
        this._watcher = fs.watch(this._filepath, {
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

export class ProjectList {
    @observable public projects: Project[] = [];
    @observable public current?: Project;
    @observable public projectDTO?: ProjectDTO;
    @observable public showFileTree = false;
    
    constructor() {
        this.refreshList();
    }

    public refreshList() {
        const paths = ipcRenderer.sendSync('get-project-list');

        // Remove old projects from list
        for (const project of this.projects) {
            project.unwatch();
        }

        this.projects = [];
        // Create new projects
        for (const path of paths) {
            try {
                const project = new Project(path);
                this.projects.push(project);
            } catch(error) {
                console.warn(`Can't find project in ${path}, removing from list`);
                ipcRenderer.send('remove-project', path);
            }
        }
    }

    public find(folder: string): Project | undefined {
        const index = this.projects.findIndex((prj) => prj.folder === folder);

        return index > -1 ? this.projects[index] : undefined;
    }

    public setCurrent(folder: string) {
        for (const project of this.projects) {
            if (project.folder === folder) {
                this.current = project;
                return;
            }
        }

        const project = new Project(folder);
        this.projects.push(project);
        this.current = project;
    }
}