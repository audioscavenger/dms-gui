const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const fs = require("fs");
const fsp = fs.promises;
// const { promises: fs } = require("fs");
const { name, version, description } = require('./package.json');  

// Docker container name for docker-mailserver
const DMS_CONTAINER = process.env.DMS_CONTAINER || 'dms';
const SETUP_SCRIPT  = process.env.SETUP_SCRIPT || '/usr/local/bin/setup';
const DB_PATH       = process.env.DB_PATH || '/app/config';
const DB_Accounts   = DB_PATH + '/db.accounts.json';
const DB_Aliases    = DB_PATH + '/db.aliases.json';
const DB_Settings   = DB_PATH + '/db.settings.json';

const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// const regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;

// Debug flag
const debug = (process.env.DEBUG === 'true') ? true : false;

// While global values are discouraged for production code, we use it to serve as a shared source of state.
// Well locking files to save or read proves too difficult, I give up
// import { Mutex } from 'async-mutex';
// const Mutex = require('async-mutex').Mutex;
// const mutex = new Mutex();
// var DBdict = {};


async function formatError(errorMsg, error) {
  // Unfortunately, we cannot list all the error types from dms just here
  // var patterns = [
    // /'?\S+'? is already an alias for recipient: '?\S+'?/i,
  // ]
  
  // patterns.forEach(function(regex){
    // if (typeof error == "string") {
      // if (error.match(regex)) errorMsg = `${errorMsg}: ` + error.match(regex)[0].replace(/[\"\'\:]/g, "");
    // } else {
      // if (error.message.match(regex)) errorMsg = `${errorMsg}: ` + error.message.match(regex)[0].replace(/[\"\'\:]/g, "");
    // }
  // });
  
  debugLog(`${arguments.callee.name}: error(${typeof error})=`,error);
  var split;
  const regexSplit = /ERROR:?|\n/i;
  const regexCleanup = /[\"\'\:\`]/g;
  
  if (typeof error == "string") {
    split = error.split(regexSplit);
  } else {
    split = error.message.split(regexSplit);
  }
  let splitError = (split.length > 1) ? split[1] : split;
  
  errorMsg = `${errorMsg}: ` + splitError.replace(regexColors,"").replace(regexPrintOnly,"").replace(regexCleanup, "");
  return errorMsg;
}


async function debugLog(message, data = null) {
  // try {
    // throw new Error('stack hack to get callee.caller in strict mode')
  // } catch (error) {
    
    // console.log(`[debug] error.stack:`, error.stack.split('\n')[2]);
      // error.stack: Error: First one
    // at debugLog (/app/backend/dockerMailserver.js:18:11)
    // at Object.getAccounts (/app/backend/dockerMailserver.js:150:11)
    // at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    // at async /app/backend/index.js:69:22
  // }
  
  if (debug) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}


/**
 * Executes a setup.sh command in the docker-mailserver container
 * @param {string} setupCommand Command to pass to setup.sh
 * @return {Promise<string>} stdout from the command
 */
async function execSetup(setupCommand) {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`${arguments.callee.name}: Executing setup command: ${setupCommand}`);
  return execInContainer(`${SETUP_SCRIPT} ${setupCommand}`);
}


/**
 * Executes a command in the docker-mailserver container
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
async function execInContainer(command) {
  try {
    debugLog(`${arguments.callee.name}: Executing command in container ${DMS_CONTAINER}: ${command}`);

    // Get container instance
    const container = docker.getContainer(DMS_CONTAINER);

    // Create exec instance
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    });

    // Start exec instance
    const stream = await exec.start();

    // Collect output
    return new Promise((resolve, reject) => {
      let stdoutData = '';
      let stderrData = '';

      stream.on('data', (chunk) => {
        // Docker multiplexes stdout/stderr in the same stream
        // First 8 bytes contain header, actual data starts at 8th byte
        stdoutData += chunk.slice(8).toString();
      });

      stream.on('end', () => {
        debugLog(`${arguments.callee.name}: Command completed. Output:`, stdoutData);
        if (stdoutData.match(/ERROR/))
          reject(stdoutData);
        else
          resolve(stdoutData);
      });

      stream.on('error', (err) => {
        debugLog(`${arguments.callee.name}: Command error:`, err);
        reject(err);
      });
    });
  } catch (error) {
    let backendError = 'Execution error for '+command ;
    let ErrorMsg = await formatError(backendError, error)
    debugLog(`${arguments.callee.name}: ${backendError}:`, error);
    throw new Error(error);
  }
}


async function readJson(jsonFile) {
  var json = {};

  debugLog(`readJson: start trying to read ${jsonFile}`);
  try {
    debugLog(`readJson: now checking if exist ${jsonFile}`);
    
    if (fs.existsSync(jsonFile)) {
      debugLog(`readJson: now trying to read ${jsonFile}`);
      
      const data = await fsp.readFile(jsonFile, "utf8");
      json = JSON.parse(Buffer.from(data));
      debugLog(`readJson: got json from ${jsonFile}`);
      
    } else {
      debugLog(`readJson: empty ${jsonFile}`);
    }
  } catch (error) {
    debugLog(`readJson: ${jsonFile} read error:`, error);
    throw new Error('readJson Error reading '+jsonFile);
  }
  return json;
}



async function writeJson(DB_JSON, DBdict) {
  // await mutex.runExclusive(async () => {
    
    if (DBdict.constructor == Object) {
      try {

        // fs.writeFileSync(DB_JSON, JSON.stringify(DBdict, null, 2), 'utf8');
        await fsp.writeFile(DB_JSON, JSON.stringify(DBdict, null, 2), 'utf8');
        console.log(`writeJson: Wrote DBdict into ${DB_JSON}`);

        
      } catch (error) {
        debugLog(`writeJson: ${DB_JSON} write error:`, error);
        throw new Error('Error writting DB_JSON');
      }
    } else {
      debugLog(`writeJson: DBdict not an Object:`, DBdict);
      throw new Error('writeJson Error: DBdict not an Object');
    }
  // });
}


// Function to retrieve settings
async function getSettings() {
  var DBdict = {};
  var settings = {};
  debugLog(`${arguments.callee.name}: start`);
  
  try {
    
    debugLog(`${arguments.callee.name}: calling DBdict readJson(${DB_Settings})`);
    DBdict = await readJson(DB_Settings);
    debugLog(`${arguments.callee.name}: DBdict:`, DBdict);
    
    // we could read DB_Settings and it is valid
    if (DBdict.constructor == Object && 'settings' in DBdict) {
      debugLog(`${arguments.callee.name}: Found ${Object.keys(DBdict['settings']).length} settings in DBdict`);
      return DBdict['settings'];
      
    // we could not read DB_Settings or it is invalid
    } else {
      console.log(`${arguments.callee.name}: ${DB_Settings} is empty`);
    }
    
    return settings;
    
  } catch (error) {
    let backendError = 'Error retrieving settings';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// Function to save settings
async function saveSettings(containerName, setupPath, username, email, password) {
  DBdict = {settings:{}};
  try {
    DBdict.settings['containerName'] = containerName;
    DBdict.settings['setupPath'] = setupPath;
    DBdict.settings['username'] = username;
    DBdict.settings['email'] = email;
    DBdict.settings['password'] = password;
    
    debugLog(`${arguments.callee.name}: Saving settings:`,DBdict.settings);
    await writeJson(DB_Settings, DBdict);
    return { success: true, containerName };
  } catch (error) {
    let backendError = 'Error saving settings';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// Function to retrieve email accounts
async function getAccounts(refresh) {
  refresh = (refresh === undefined) ? false : refresh;
  var DBdict = {};
  var accounts = [];
  debugLog(`${arguments.callee.name}: start (refresh=${refresh})`);
  
  try {
    
     if (!refresh) {
      debugLog(`${arguments.callee.name}: read DBdict from ${DB_Accounts} (refresh=${refresh})`);
      
        DBdict = await readJson(DB_Accounts);
        // debugLog(`${arguments.callee.name}: DBdict:`, DBdict);
    }
    

    // we could read DB_Accounts and it is valid
    if (DBdict.constructor == Object && 'accounts' in DBdict) {
      debugLog(`${arguments.callee.name}: Found ${DBdict['accounts'].length} accounts in DBdict`);
      return DBdict['accounts'];
      
    // we could not read DB_Accounts or it is invalid
    } else {
      // try {
        accounts = await getAccountsFromDMS();
        debugLog(`${arguments.callee.name}: got ${accounts.length} accounts from getAccountsFromDMS()`);
      // } catch (error) {
        // console.error(`${arguments.callee.name}: Error with getAccountsFromDMS():`, error);
      // }
    }
    
    // since we had to call getAccountsFromDMS, we save DB_Accounts
    if (Array.isArray(accounts) && accounts.length) {
      DBdict["accounts"] = accounts;
      // DBdict = { ...DBdict, "accounts": accounts };
      // console.debug('ddebug ----------------------------- DBdict',DBdict);
      
      // try {
        await writeJson(DB_Accounts, DBdict);
      // } catch (error) {
        // console.error(`${arguments.callee.name}:writeJson(DBdict) error:`, error);
      // }
      
    // unknown error
    } else {
      console.error(`${arguments.callee.name}: error with accounts:`, accounts);
    }


    return accounts;
    
  } catch (error) {
    let backendError = 'Error retrieving accounts';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to retrieve email accounts from DMS
async function getAccountsFromDMS() {
  const command = 'email list';
  try {
    debugLog(`${arguments.callee.name}: execSetup(${command})`);
    const stdout = await execSetup(command);
    const accounts = [];

    // Parse multiline output with regex to extract email and size information
    // const emailLineValidChars = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/g;
    const emailLineValidChars = /[^\w\.\~\.\-_@\s\*\%]/g;
    // const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\.\S+)\s+\(\s+([\w\.\~]+)\s+\/\s+([\w\.\~]+)\s+\)\s+\[(\d+)%\]/;
    const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\S+)\s+([\w\.\~]+)\s+([\w\.\~]+)\s+(\d+)%/;
    const accountLineRegexQuotaOFF = /(\*\s+)(\S+)@(\S+\S+)/;

    // Process each line individually
    const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
    // debugLog(`${arguments.callee.name}: email list RAW response:`, lines);

    for (let i = 0; i < lines.length; i++) {
      debugLog(`${arguments.callee.name}: email list line RAW  :`, lines[i]);
      
      // Clean the line from binary control characters
      const line = lines[i].replace(emailLineValidChars, '').trim();
      debugLog(`${arguments.callee.name}: email list line CLEAN:`, line);

      // Check if line contains * which indicates an account entry
      if (line.includes('*')) {
        const matchQuotaON  = line.match(accountLineRegexQuotaON);
        const matchQuotaOFF = line.match(accountLineRegexQuotaOFF);

        if (matchQuotaON) {
          // matchQuotaON = [ "* user@domain.com ( 2.5G / 30G ) [8%]", "* ", "user", "domain.com", "2.5G", "30G", "8" ]
          // matchQuotaON = [ "* user@domain.com 2.5G 30G 8%", "* ", "user", "domain.com", "2.5G", "30G", "8" ]
          const email = `${matchQuotaON[2]}@${matchQuotaON[3]}`;
          
          // this works only if Dovecot ENABLE_QUOTAS=1
          const usedSpace = matchQuotaON[4];
          const totalSpace = matchQuotaON[5] === '~' ? 'unlimited' : matchQuotaON[5];
          const usagePercent = matchQuotaON[6];

          debugLog(
            `Parsed account: ${email}, Storage: ${usedSpace}/${totalSpace} [${usagePercent}%]`
          );

          accounts.push({
            email,
            storage: {
              used: usedSpace,
              total: totalSpace,
              percent: usagePercent + '%',
            },
          });
        } else if  (matchQuotaOFF) {
          // matchQuotaOFF = [ "* user@domain.com", "* ", "user", "domain.com" ]
          const email = `${matchQuotaOFF[2]}@${matchQuotaOFF[3]}`;

          accounts.push({
            email,
          });
        } else {
          debugLog(`${arguments.callee.name}: Failed to parse account line: ${line}`);
        }
      }
    }

    debugLog(`${arguments.callee.name}: Found ${accounts.length} accounts`);
    return accounts;
  } catch (error) {
    let backendError = `Error execSetup(${command}): ${error}`;
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to add a new email account
async function addAccount(email, password) {
  try {
    debugLog(`${arguments.callee.name}: Adding new email account: ${email}`);
    await execSetup(`email add ${email} ${password}`);
    debugLog(`${arguments.callee.name}: Account created: ${email}`);
    return { success: true, email };
  } catch (error) {
    let backendError = 'Error adding account';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to update an email account password
async function updateAccountPassword(email, password) {
  try {
    debugLog(`${arguments.callee.name}: Updating password for account: ${email}`);
    await execSetup(`email update ${email} ${password}`);
    debugLog(`${arguments.callee.name}: Password updated for account: ${email}`);
    return { success: true, email };
  } catch (error) {
    let backendError = 'Error updating account password';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to delete an email account
async function deleteAccount(email) {
  try {
    debugLog(`${arguments.callee.name}: Deleting email account: ${email}`);
    await execSetup(`email del ${email}`);
    debugLog(`${arguments.callee.name}: Account deleted: ${email}`);
    return { success: true, email };
  } catch (error) {
    let backendError = 'Error deleting account';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to retrieve aliases
async function getAliases(refresh) {
  refresh = (refresh === undefined) ? false : refresh;
  
  var DBdict = {};
  var aliases = [];
  debugLog(`${arguments.callee.name}: start (refresh=${refresh})`);
  
  try {
    debugLog(`ddebug getAliases refresh=${refresh} from DB_Aliases=${DB_Aliases} ifexist=${fs.existsSync(DB_Aliases)}`);
    
    if (!refresh) {
      debugLog(`ddebug getAliases read DBdict from ${DB_Aliases} (refresh=${refresh})`);
      
        DBdict = await readJson(DB_Aliases);
    }
    

    // we could read DB_Aliases and it is valid
    if (DBdict.constructor == Object && 'aliases' in DBdict) {
      debugLog(`${arguments.callee.name}: Found ${DBdict['aliases'].length} aliases in DBdict`);
      return DBdict['aliases'];
      
    // we could not read DB_Aliases or it is invalid
    } else {
      // try {
        aliases = await getAliasesFromDMS();
        debugLog(`${arguments.callee.name}: got ${aliases.length} aliases from getAliasesFromDMS()`);
      // } catch (error) {
        // console.error(`${arguments.callee.name}: Error with getAliasesFromDMS():`, error);
      // }
    }
    
    // since we had to call getAliasesFromDMS, we save DB_Aliases
    if (Array.isArray(aliases) && aliases.length) {
      DBdict["aliases"] = aliases;
      // DBdict = { ...DBdict, "aliases": aliases };
      // console.debug('ddebug ----------------------------- DBdict',DBdict);
      
      // try {
        await writeJson(DB_Aliases, DBdict);
      // } catch (error) {
        // console.error(`${arguments.callee.name}: writeJson(DBdict) error:`, error);
      // }
      
    // unknown error
    } else {
      console.error(`${arguments.callee.name}: error with aliases:`, aliases);
    }


    return aliases;
    
  } catch (error) {
    let backendError = 'Error retrieving aliases';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
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
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
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
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
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
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
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
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to check server status
async function getServerStatus() {
  try {
    debugLog(`${arguments.callee.name}: Getting server status`);

    // Get this project version
    // const { name, version } = await readJson(process.cwd() + '/../package.json');
    // const { name, version } = await readJson('/app/package.json');
    
    // Get container info
    const container = docker.getContainer(DMS_CONTAINER);
    const containerInfo = await container.inspect();
    // debugLog(`${arguments.callee.name}: ddebug containerInfo:`, containerInfo);

    // Check if container is running
    const isRunning = containerInfo.State.Running === true;
    debugLog(`${arguments.callee.name}: Container running: ${isRunning}`);

    let diskUsage = '0%';
    let cpuUsage = '0%';
    let memoryUsage = '0MB';

    if (isRunning) {
      // Get container stats
      debugLog(`${arguments.callee.name}: Getting container stats`);
      const stats = await container.stats({ stream: false });

      // Calculate CPU usage percentage
      const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage
        - stats.precpu_stats.cpu_usage.total_usage;
      const systemCpuDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent =
        (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus * 100;
      cpuUsage = `${cpuPercent.toFixed(2)}%`;

      // Calculate memory usage
      const memoryUsageBytes = stats.memory_stats.usage;
      memoryUsage = formatMemorySize(memoryUsageBytes);

      debugLog(`${arguments.callee.name}: Resources - CPU: ${cpuUsage}, Memory: ${memoryUsage}`);

      // For disk usage, we would need to run a command inside the container
      // This could be a more complex operation involving checking specific directories
      // For simplicity, we'll set this to "N/A" or implement a basic check
      diskUsage = 'N/A';
    }

    const result = {
      status: isRunning ? 'running' : 'stopped',
      name: name,
      version: version,
      resources: {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
      },
    };

    debugLog(`${arguments.callee.name}: Server status result:`, result);
    return result;
  } catch (error) {
    let backendError = `Server status error: ${error}`;
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    return {
      status: 'unknown',
      error: error.message,
    };
  }
}

// Helper function to format memory size
function formatMemorySize(bytes) {
  if (bytes === 0) return '0B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + sizes[i];
}

// export default (
module.exports = {
  debugLog,
  getAccounts,
  addAccount,
  updateAccountPassword,
  deleteAccount,
  getAliases,
  addAlias,
  deleteAlias,
  getServerStatus,
  readJson,
  getSettings,
  saveSettings,
};
// );
