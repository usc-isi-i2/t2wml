import * as fs from 'fs';
import { action, observable } from 'mobx';
import { ProjectDTO } from './dtos';
import wikiStore from '../data/store';

export class CurrentFiles {
    @observable dataFile = "";
    @observable sheetName = "";
    @observable mappingFile: string | undefined;
    @observable mappingType: 'Yaml' | 'Annotation' | undefined;
}

const filename = 't2wmlproj.user.json';

export class CurrentFilesService {
    // Instance needed ?
    private static _instance?: CurrentFilesService;
    public static get instance() {
        if (!CurrentFilesService._instance) {
            CurrentFilesService._instance = new CurrentFilesService();
        }

        return CurrentFilesService._instance;
    }

    @observable currentState = new CurrentFiles();
    @observable prevSelections = {};

    getAnnotationFileFromProject() {
        const project = wikiStore.project.projectDTO!;
        if (Object.keys(project.annotations).length && project.annotations[this.currentState.dataFile!]) {
            return project.annotations[this.currentState.dataFile!][this.currentState.sheetName!].val_arr[0];
        }
        return undefined;
    }

    getDefaultFiles(project: ProjectDTO){
        //also called when deleting a file
        if (Object.keys(project.data_files).length) {
            this.currentState.dataFile = Object.keys(project.data_files)[0];
            this.currentState.sheetName = project.data_files[this.currentState.dataFile].val_arr[0];
        }

        if (Object.keys(project.annotations).length && project.annotations[this.currentState.dataFile!]) {
            this.currentState.mappingFile = project.annotations[this.currentState.dataFile!][this.currentState.sheetName!].val_arr[0];
            this.currentState.mappingType = 'Annotation';
        } else if (Object.keys(project.yaml_sheet_associations).length && project.yaml_sheet_associations[this.currentState.dataFile!]) {
            this.currentState.mappingFile = project.yaml_sheet_associations[this.currentState.dataFile!][this.currentState.sheetName!].val_arr[0];
            this.currentState.mappingType = 'Yaml';
        } else {
            this.currentState.mappingFile = undefined;
            this.currentState.mappingType = undefined;
        }

        this.saveCurrentFileSelections();
    }

    @action
    getFiles(project: ProjectDTO) {
        this.currentState = new CurrentFiles();
        try {
            const path = `${project.directory}/${filename}`;
            const content = fs.readFileSync(path, { encoding: 'utf8' });
            if (content) {
                const contentObj: any = JSON.parse(content);
                if (contentObj.currentState) {
                    this.currentState = contentObj.currentState;
                    if (!this.currentState.dataFile || !this.currentState.sheetName) {
                        throw 'current state is empty';
                    }
                }

                if (contentObj.prevSelections) {
                    this.prevSelections = contentObj.prevSelections;
                }
            } else{
                throw("No content")
            }
        } catch (exception) {
            console.log(exception)
            // If the file doen't exist, or is invalid, default to the first files
            this.getDefaultFiles(project)
        }
    }

    @action
    setMappingFiles() {
        //also called when deleting a mapping file
        const project = wikiStore.project.projectDTO!;
        const dataFile = this.currentState.dataFile!;
        const sheet = this.currentState.sheetName!;

        if (Object.keys(project.annotations).length && project.annotations[dataFile] && project.annotations[dataFile][sheet]) {
            this.currentState.mappingFile = project.annotations[dataFile][sheet].val_arr[0];
            this.currentState.mappingType = "Annotation";
        } else if (Object.keys(project.yaml_sheet_associations).length && project.yaml_sheet_associations[dataFile] && project.yaml_sheet_associations[dataFile][sheet]) {
            this.currentState.mappingFile = project.yaml_sheet_associations[dataFile][sheet].val_arr[0];
            this.currentState.mappingType = "Yaml";
        }
        else {
            this.currentState.mappingFile = undefined;
            this.currentState.mappingType = undefined;
        }
        this.saveCurrentFileSelections();
    }

    getAnnotationsLength(): number{
        const project = wikiStore.project.projectDTO!;
        const dataFile = this.currentState.dataFile!;
        const sheet = this.currentState.sheetName!;

        if (Object.keys(project.annotations).length && project.annotations[dataFile] && project.annotations[dataFile][sheet]) {
            return project.annotations[dataFile][sheet].val_arr.length
        }
        return 0;
    }

    @action
    changeDataFile(newFile: string) {
        const project = wikiStore.project.projectDTO!;
        this.currentState.dataFile = newFile;
        this.currentState.sheetName = project.data_files[newFile].val_arr[0];

        this.setMappingFiles();
    }

    @action
    changeSheet(newSheet: string, dataFile: string) {
        const project = wikiStore.project.projectDTO!;
        this.currentState.dataFile = dataFile;
        // If this sheet is not part of current datafile, search the relevant data file.
        if (project.data_files[this.currentState.dataFile].val_arr.indexOf(newSheet) < 0) {
            for (const df of Object.keys(project.data_files)) {
                if (project.data_files[df].val_arr.indexOf(newSheet) > -1) {
                    this.currentState.dataFile = df;
                }
            }
        }
        this.currentState.sheetName = newSheet;

        this.setMappingFiles();

    }

    @action
    changeYaml(newYaml: string, sheetName: string, dataFile: string) {
        const project = wikiStore.project.projectDTO!;
        this.currentState.dataFile = dataFile;
        this.currentState.sheetName = sheetName;
        // If this yaml is not part of current datafile, search the relevant data file and sheet.
        if (project.yaml_sheet_associations[this.currentState.dataFile][this.currentState.sheetName].val_arr.indexOf(newYaml) < 0) {
            for (const df of Object.keys(project.yaml_sheet_associations)) {
                for (const sheet of Object.keys(project.yaml_sheet_associations[df])) {
                    if (project.yaml_sheet_associations[df][sheet].val_arr.indexOf(newYaml) > -1) {
                        this.currentState.dataFile = df;
                        this.currentState.sheetName = sheet;
                    }
                }
            }
        }

        this.currentState.mappingFile = newYaml;
        this.currentState.mappingType = 'Yaml';

        this.saveCurrentFileSelections();
    }

    @action
    changeYamlInSameSheet(newYaml: string) {
        this.currentState.mappingFile = newYaml;
        this.currentState.mappingType = 'Yaml';
        this.saveCurrentFileSelections();
    }

    @action
    changeAnnotation(newAnnotation: string, sheetName: string, dataFile: string) {
        const project = wikiStore.project.projectDTO!;
        currentFilesService.currentState.dataFile = dataFile;
        currentFilesService.currentState.sheetName = sheetName;
        // If this yaml is not part of current datafile, search the relevant data file and sheet.
        if (project.annotations[this.currentState.dataFile][this.currentState.sheetName].val_arr.indexOf(newAnnotation) < 0) {
            for (const df of Object.keys(project.annotations)) {
                for (const sheet of Object.keys(project.annotations[df])) {
                    if (project.annotations[df][sheet].val_arr.indexOf(newAnnotation) > -1) {
                        this.currentState.dataFile = df;
                        this.currentState.sheetName = sheet;
                    }
                }
            }
        }

        this.currentState.mappingFile = newAnnotation;
        this.currentState.mappingType = 'Annotation';

        this.saveCurrentFileSelections();
    }

    saveCurrentFileSelections() {
        const project = wikiStore.project.projectDTO;
        if (project){
        const path = `${project.directory}/${filename}`;
        try{
        fs.writeFileSync(path, JSON.stringify({
            'currentState': this.currentState,
            // 'previousSelections': this.prevSelections,
        }));
    }catch (exception){
        console.error(exception) //do not break the entire frontend over saving the selected files
    }
        }
    }
}

export const currentFilesService = CurrentFilesService.instance;
