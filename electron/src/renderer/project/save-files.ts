// import * as os from 'os';
import * as fs from 'fs';
import { ProjectDTO } from '../common/dtos';

interface Data {
    currentState: CurrentFiles;
    prevSelections: any;
}

interface CurrentFiles {
    dataFile: string;
	sheetName: string;
	yamlFile: string | null;
	annotationFile: string | null;
}


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


    // getFiles() {

    // }

    saveFiles(directory: string) {
        const path = `${directory}/t2wmlproj.user.json`;
        fs.writeFileSync(path, JSON.stringify({
            'current state': this.currentState,
            // 'previous selections': this.prevSelections,
        }));
    }

    fillCurrents() {
        this.currentState = {
            dataFile: "string",
            sheetName: "string",
            yamlFile: "string",
            annotationFile: "string | null"
        };
    }

    fillPrevSelections(project: ProjectDTO) {
        const dataFiles = [];
        if (project && project.data_files) {
            for (const file of Object.keys(project.data_files).sort()) {
                const sheets = [];
                for (const sheet of project.data_files[file]["val_arr"]) {
                    const yamls = [];
                    if (project.yaml_sheet_associations[file] && project.yaml_sheet_associations[file][sheet]) {
                        for (const yaml of project.yaml_sheet_associations[file][sheet].val_arr) {
                            yamls.push({ name: yaml, type: "yaml" });
                        }
                    }
                    if (project.annotations[file] && project.annotations[file][sheet]) {
                        for (const annotation of project.annotations[file][sheet].val_arr) {
                            yamls.push({ name: annotation, type: "annotation" });
                        }
                    }
                    sheets.push({ name: sheet, type: "sheet", YamlsAndAnnotoions: yamls });
                }
                dataFiles.push({ name: file, type: "datafile", Sheets: sheets });
            }
        }
        this.prevSelections = {
            name: project.title,
            DataFiles: dataFiles
        }        
    }

    fillFilesData(project: ProjectDTO) {
        this.fillCurrents();
        this.fillPrevSelections(project);
        this.saveFiles(project.directory);
    }
}

export const saveFiles = SaveFiles.instance;