// The App's settings
import * as os from 'os';
import * as fs from 'fs';
import { ProjectDTO } from '../common/dtos';

interface WindowSettings {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maximized: boolean;
}

interface DevSettings {
    devToolsOpen: boolean;
}

interface AppSettings {
    recentlyUsed: string[];
    window: WindowSettings;
    dev: DevSettings;
}

// Settings stored here 
const file = `${os.homedir()}/.t2wml/t2wmlproj.user.json`;

export class SaveFiles {
    private static _instance?: SaveFiles
    public static get instance() {
        if (!SaveFiles._instance) {
            SaveFiles._instance = new SaveFiles();
        }

        return SaveFiles._instance;
    }

    recentlyUsed: string[] = [];


    // getFiles() {

    // }

    saveFiles(data: any) {
        fs.writeFileSync(file, JSON.stringify({
            data: data,
        }));
    }

    // TODO - add currents
    fillFilesData(project: ProjectDTO) {
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
        const data = {
            name: project.title,
            DataFiles: dataFiles
        }
            
        this.saveFiles(data);
    }
}

export const saveFiles = SaveFiles.instance;