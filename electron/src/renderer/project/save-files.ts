// import * as os from 'os';
import * as fs from 'fs';
import { action } from 'mobx';
import { ProjectDTO } from '../common/dtos';
import wikiStore from '../data/store';

interface Data {
    currentState: CurrentFiles;
    prevSelections: any;
}

export interface CurrentFiles {
    dataFile: string;
	sheetName: string;
	yamlFile: string | undefined;
	annotationFile: string | undefined;
}

// send these params to the backend when asking project data
export interface StateParams extends CurrentFiles {
    directory: string;
}

const filename = 't2wmlproj.user.json';

export class SaveFiles implements Data {
    // Instance needed ?
    private static _instance?: SaveFiles;
    public static get instance() {
        if (!SaveFiles._instance) {
            SaveFiles._instance = new SaveFiles();
        }

        return SaveFiles._instance;
    }

    currentState: CurrentFiles = {} as CurrentFiles;
    prevSelections = {};


    getFiles(project: ProjectDTO) {
        try {
            const path = `${project.directory}/${filename}`;
            const content = fs.readFileSync(path, {encoding: 'utf8'});
            if (content) {
                const contentObj: any = JSON.parse(content);
                if (contentObj.currentState) {
                    this.currentState = contentObj.currentState;
                }

                if (contentObj.prevSelections) {
                    this.prevSelections = contentObj.prevSelections;
                }
            }
        } catch {
            // If the file doen't exist, first files are the defaults
            if (project.data_files) {
                this.currentState.dataFile = Object.keys(project.data_files)[0];
                this.currentState.sheetName = project.data_files[this.currentState.dataFile].val_arr[0];
            }
            
            if (Object.keys(project.yaml_sheet_associations).length && project.yaml_sheet_associations[this.currentState.dataFile]) {
                this.currentState.yamlFile = project.yaml_sheet_associations[this.currentState.dataFile][this.currentState.sheetName].val_arr[0];
            } else {
                this.currentState.yamlFile = undefined;
            }

            if (Object.keys(project.annotations).length && project.annotations[this.currentState.dataFile]) {
                this.currentState.annotationFile = project.annotations[this.currentState.dataFile][this.currentState.sheetName].val_arr[0];
            } else {
                this.currentState.annotationFile = undefined;
            }

            this.saveFiles(project.directory);
        }
    }

    changeDataFile(newFile: string) {
        const project = wikiStore.projects.projectDTO!;
        this.currentState.dataFile = newFile;
        this.currentState.sheetName = project.data_files[newFile].val_arr[0];
        if (Object.keys(project.yaml_sheet_associations).length && project.yaml_sheet_associations[newFile] && project.yaml_sheet_associations[newFile][this.currentState.sheetName]) {
            this.currentState.yamlFile = project.yaml_sheet_associations[newFile][this.currentState.sheetName].val_arr[0];
        } else {
            this.currentState.yamlFile = undefined;
        }
        if (Object.keys(project.annotations).length && project.annotations[newFile] && project.annotations[newFile][this.currentState.sheetName]) {
            this.currentState.annotationFile = project.annotations[newFile][this.currentState.sheetName].val_arr[0];
        } else {
            this.currentState.annotationFile = undefined;
        }

        this.saveFiles(project.directory);
    }

    changeSheet(newSheet: string) {
        const project = wikiStore.projects.projectDTO!;
        // If this sheet is not part of current datafile, search the relevant data file.
        if (project.data_files[this.currentState.dataFile].val_arr.indexOf(newSheet) < 0) {
            for (const df of Object.keys(project.data_files)) {
                if (project.data_files[df].val_arr.indexOf(newSheet) > -1) {
                    this.currentState.dataFile = df;
                }
            }
        }
        const dataFile = this.currentState.dataFile;
        this.currentState.sheetName = newSheet;
        if (Object.keys(project.yaml_sheet_associations).length && project.yaml_sheet_associations[dataFile] && project.yaml_sheet_associations[dataFile][newSheet]) {
            this.currentState.yamlFile = project.yaml_sheet_associations[dataFile][newSheet].val_arr[0];
        } else {
            this.currentState.yamlFile = undefined;
        }
        if (Object.keys(project.annotations).length && project.annotations[dataFile] && project.annotations[dataFile][newSheet]) {
            this.currentState.annotationFile = project.annotations[dataFile][newSheet].val_arr[0];
        } else {
            this.currentState.annotationFile = undefined;
        }

        this.saveFiles(project.directory);
    }

    changeYaml(newYaml: string) {
        const project = wikiStore.projects.projectDTO!;
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

        this.currentState.yamlFile = newYaml;
        const dataFile = this.currentState.dataFile;
        const sheet = this.currentState.sheetName;
        
        if (Object.keys(project.annotations).length && project.annotations[dataFile] && project.annotations[dataFile][sheet]) {
            this.currentState.annotationFile = project.annotations[dataFile][sheet].val_arr[0];
        } else {
            this.currentState.annotationFile = undefined;
        }

        this.saveFiles(project.directory);
    }

    changeAnnotation(newAnnotation: string) {
        const project = wikiStore.projects.projectDTO!;
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

        this.currentState.annotationFile = newAnnotation;
        const dataFile = this.currentState.dataFile;
        const sheet = this.currentState.sheetName;
        
        if (Object.keys(project.yaml_sheet_associations).length && project.yaml_sheet_associations[dataFile] && project.yaml_sheet_associations[dataFile][sheet]) {
            this.currentState.yamlFile = project.yaml_sheet_associations[dataFile][sheet].val_arr[0];
        } else {
            this.currentState.yamlFile = undefined;
        }
        
        this.saveFiles(project.directory);
    }

    saveFiles(directory: string) {
        const path = `${directory}/${filename}`;
        fs.writeFileSync(path, JSON.stringify({
            'currentState': this.currentState,
            // 'previousSelections': this.prevSelections,
        }));
    }

    fillCurrents() {
        // this.currentState = {
        //     dataFile: "string",
        //     sheetName: "string",
        //     yamlFile: "string",
        //     annotationFile: "string | null"
        // };
    }

    // fillPrevSelections(project: ProjectDTO) {
    //     const dataFiles = [];
    //     if (project && project.data_files) {
    //         for (const file of Object.keys(project.data_files).sort()) {
    //             const sheets = [];
    //             for (const sheet of project.data_files[file]["val_arr"]) {
    //                 const yamls = [];
    //                 if (project.yaml_sheet_associations[file] && project.yaml_sheet_associations[file][sheet]) {
    //                     for (const yaml of project.yaml_sheet_associations[file][sheet].val_arr) {
    //                         yamls.push({ name: yaml, type: "yaml" });
    //                     }
    //                 }
    //                 if (project.annotations[file] && project.annotations[file][sheet]) {
    //                     for (const annotation of project.annotations[file][sheet].val_arr) {
    //                         yamls.push({ name: annotation, type: "annotation" });
    //                     }
    //                 }
    //                 sheets.push({ name: sheet, type: "sheet", YamlsAndAnnotoions: yamls });
    //             }
    //             dataFiles.push({ name: file, type: "datafile", Sheets: sheets });
    //         }
    //     }
    //     this.prevSelections = {
    //         name: project.title,
    //         DataFiles: dataFiles
    //     }        
    // }

    // fillFilesData() {
    //     const project = wikiStore.projects.projectDTO!;
    //     this.fillCurrents();
    //     this.fillPrevSelections(project);
    //     this.saveFiles(project.directory);
    // }
}

export const saveFiles = SaveFiles.instance;