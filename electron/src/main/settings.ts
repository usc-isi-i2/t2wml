// The App's settings
import * as os from 'os';
import * as fs from 'fs';

interface AppSettings {
    recentlyUsed: string[];
}

// Settings stored here 
const file = `${os.homedir()}/.t2wml/gui-settings.json`;

class Settings implements AppSettings {
    recentlyUsed: string[] = [];

    constructor() {
        // TODO: Wrap with try/catch, if the file doen't exist, don't change the defaults
        const content = fs.readFileSync(file, {encoding: 'utf8'});
        if (content) {
            const contentObj: any = JSON.parse(content);
            this.recentlyUsed = contentObj.recentlyUsed || [];
        }
    }

    saveSettings() {
        // use path.join to join the files -
        // todo- what is the file?
        fs.writeFileSync(file, JSON.stringify(this.recentlyUsed))
    }

    addRecentlyUsed(folder: string) {
        const index = this.recentlyUsed.indexOf(folder);
        if (index > -1) {
            this.recentlyUsed.splice(index, 1);
        }
        this.recentlyUsed.unshift(folder);

        this.saveSettings();
    }
}

export default Settings;

// TODO:
// 1. Create a Settings class, implementing AppSettings.
//    in the constructor read the settings from the gui-settings.json file (if it doesn't exist, use reasonable defaults)
//    fs.readFileSync(file, [encoding]); // 'utf-8' is the encoding
// 2. Add a save method that saves the settings to the file
//    fs.writeFileSync(file, text);
// 3. Add a function called addRecentlyUsed(folder: string)
//    This function will add the folder to the beginning of recentlyUsed. If the folder is already in
//    recentlyUsed ('b' is called, and 'a' 'b' 'c' is in the list), move it to the top (result will be 'b' 'a' 'c')
//    and also calls save()