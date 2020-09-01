// The App's settings
import * as os from 'os';
import * as fs from 'fs';

// Settings will be stored in 
// os.homedir()/.t2wml/gui-settings.json
// use path.join to join the files

interface AppSettings {
    recentlyUsed: string[];
}

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