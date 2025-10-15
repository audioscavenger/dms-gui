require('./env.js');
const {
  docker,
  formatMemorySize,
  jsonFixTrailingCommas,
  formatDMSError,
  debugLog,
  execSetup,
  execCommand,
  readJson,
  writeJson,
} = require('./backend.js');
require('./db.js');

const fs = require("fs");
const fsp = fs.promises;
const crypto = require('node:crypto');


const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// const regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;


// Function to retrieve aliases
async function getAliases(refresh) {
  refresh = (refresh === undefined) ? false : refresh;
  debugLog(`${arguments.callee.name}: start (refresh=${refresh})`);
  
  var DBdict = {};
  var aliases = [];
  
  try {
    debugLog(`getAliases refresh=${refresh} from DB_Aliases=${DB_Aliases} ifexist=${fs.existsSync(DB_Aliases)}`);
    
    if (!refresh) {
      debugLog(`getAliases read DBdict from ${DB_Aliases} (refresh=${refresh})`);
      DBdict = await readJson(DB_Aliases);
    
      // we could read DB_Aliases and it is valid
      if (DBdict.constructor == Object && 'aliases' in DBdict) {
        debugLog(`${arguments.callee.name}: Found ${DBdict['aliases'].length} aliases in DBdict`);
        return DBdict['aliases'];
      }
        
      // we could not read DB_Aliases or it is invalid
    }

    // force refresh if no db
    if (!DBdict.aliases) {
        aliases = await getAliasesFromDMS();
        debugLog(`${arguments.callee.name}: got ${aliases.length} aliases from getAliasesFromDMS()`);
    }
    
    // since we had to call getAliasesFromDMS, we save DB_Aliases
    if (Array.isArray(aliases) && aliases.length) {
      // DBdict["aliases"] = aliases;
      DBdict = { ...DBdict, "aliases": aliases };
      // if (debug) console.debug('ddebug ----------------------------- DBdict',DBdict);
      await writeJson(DB_Aliases, DBdict);
      
    // unknown error
    } else {
      console.error(`${arguments.callee.name}: error with aliases:`, aliases);
    }


    return aliases;
    
  } catch (error) {
    let backendError = 'Error retrieving aliases';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}


// Function to retrieve aliases from DMS
async function getAliasesFromDMS() {
  const command = 'alias list';
  try {
    debugLog(`${arguments.callee.name}: execSetup(${command})`);
    const stdout = await execSetup(command);
    const aliases = [];

    // Parse each line in the format "* source destination"
    const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
    debugLog(`${arguments.callee.name}: Raw alias list response:`, lines);

    // Modified regex to be more tolerant of control characters that might appear in the output
    const emailLineValidChars = /[^\w\.\~\.\-_@\s\*\%]/g;
    const aliasRegex = /\*\s+(\S+@\S+)\s+(\S+@\S+)/;

    for (let i = 0; i < lines.length; i++) {
      // Clean the line from binary control characters
      const line = lines[i].replace(emailLineValidChars, '').trim();

      if (line.includes('*')) {
        const match = line.match(aliasRegex);
        if (match) {
          const source = match[1];
          const destination = match[2];
          debugLog(`${arguments.callee.name}: Parsed alias: ${source} -> ${destination}`);

          aliases.push({
            source,
            destination,
          });
        } else {
          debugLog(`${arguments.callee.name}: Failed to parse alias line: ${line}`);
        }
      }
    }

    debugLog(`${arguments.callee.name}: Found ${aliases.length} aliases`);
    return aliases;
  } catch (error) {
    let backendError = `Error execSetup(${command}): ${error}`;
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to retrieve aliases
async function getAliasesOLD() {
  try {
    debugLog(`${arguments.callee.name}: Getting aliases list`);
    const stdout = await execSetup('alias list');
    const aliases = [];

    // Parse each line in the format "* source destination"
    const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
    debugLog(`${arguments.callee.name}: Raw alias list response:`, lines);

    // Modified regex to be more tolerant of control characters that might appear in the output
    const aliasRegex = /\* ([\w\-\.@]+) ([\w\-\.@]+)$/;

    for (let i = 0; i < lines.length; i++) {
      // Clean the line from binary control characters
      const line = lines[i].replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();

      if (line.includes('*')) {
        const match = line.match(aliasRegex);
        if (match) {
          const source = match[1];
          const destination = match[2];
          debugLog(`${arguments.callee.name}: Parsed alias: ${source} -> ${destination}`);

          aliases.push({
            source,
            destination,
          });
        } else {
          debugLog(`${arguments.callee.name}: Failed to parse alias line: ${line}`);
        }
      }
    }

    debugLog(`${arguments.callee.name}: Found ${aliases.length} aliases`);
    return aliases;
  } catch (error) {
    let backendError = 'Error retrieving aliases';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to add an alias
async function addAlias(source, destination) {
  try {
    debugLog(`${arguments.callee.name}: Adding new alias: ${source} -> ${destination}`);
    await execSetup(`alias add ${source} ${destination}`);
    debugLog(`${arguments.callee.name}: Alias created: ${source} -> ${destination}`);
    return { success: true, source, destination };
  } catch (error) {
    let backendError = 'Unable to add alias';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

// Function to delete an alias
async function deleteAlias(source, destination) {
  try {
    debugLog(`${arguments.callee.name}: Deleting alias: ${source} => ${destination}`);
    await execSetup(`alias del ${source} ${destination}`);
    debugLog(`${arguments.callee.name}: Alias deleted: ${source} => ${destination}`);
    return { success: true, source, destination };
  } catch (error) {
    let backendError = 'Unable to delete alias';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}


module.exports = {
  getAliases,
  addAlias,
  deleteAlias,
};


