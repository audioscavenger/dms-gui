const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const fs = require("fs");
const fsp = fs.promises;
// const { promises: fs } = require("fs");

const common = require ('./functions.js');
const debug = (process.env.DEBUG === 'true') ? true : false;

// const { name, version, description } = require('./package.json');  
const DMSGUI_VERSION = process.env.DMSGUI_VERSION;
const DMSGUI_DESCRIPTION = process.env.DMSGUI_DESCRIPTION;
const HOSTNAME = process.env.HOSTNAME;
const NODE_ENV = process.env.NODE_ENV || 'production';
const PORT_NODEJS = process.env.PORT_NODEJS || 3001;
const TZ = process.env.TZ || 'UTC';

// Docker container name for docker-mailserver
const DMS_CONTAINER = process.env.DMS_CONTAINER || 'dms';
const SETUP_SCRIPT  = process.env.SETUP_SCRIPT || '/usr/local/bin/setup';
const DB_PATH       = process.env.DB_PATH || '/app/config';
const DB_Accounts   = DB_PATH + '/db.accounts.json';
const DB_Aliases    = DB_PATH + '/db.aliases.json';
const DB_Settings   = DB_PATH + '/db.settings.json';
const DB_Logins     = DB_PATH + '/db.logins.json';
const DB_Status     = DB_PATH + '/db.status.json';

const DMS_OPTIONS   = [
'DMS_RELEASE',
'ENABLE_RSPAMD',
'ENABLE_XAPIAN',
'ENABLE_MTA_STS',
'PERMIT_DOCKER',
'DOVECOT_MAILBOX_FORMAT',
'POSTFIX_MAILBOX_SIZE_LIMIT',
];


const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// const regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;


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
  
  var splitErrorClean = '';
  if (error) {
    var split;
    const regexSplit = /ERROR:?|\n/i;
    const regexCleanup = /[\"\'\:\`]/g;
    
    if (typeof error == "string") {
      split = error.split(regexSplit);
    } else {
      split = error.message.split(regexSplit);
    }
    
    const splitError = (split.length > 1) ? split[1] : split[0];
    splitErrorClean = splitError.replace(regexColors,"").replace(regexPrintOnly,"").replace(regexCleanup, "")
  }
  
  errorMsg = `${errorMsg}: ${splitErrorClean}`;
  return errorMsg;
}


var jsonFixTrailingCommas = function (jsonString, returnJson=false) {
  var jsonObj;
  eval('jsonObj = ' + jsonString);
  if (returnJson) return jsonObj;
  else return JSON.stringify(jsonObj);
}


// Helper function to format memory size
function formatMemorySize(bytes) {
  if (bytes === 0) return '0B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + sizes[i];
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


async function execCommand(command) {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`${arguments.callee.name}: Executing system command: ${command}`);
  return execInContainer(command);
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
        // debugLog(`${arguments.callee.name}: Command completed. Output:`, stdoutData);
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
      debugLog(`${arguments.callee.name}: Found ${Object.keys(DBdict['settings']).length} settings in DB_Settings`);
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
async function saveSettings(containerName, setupPath='', dnsProvider='') {
  DBdict = {settings:{}};
  try {
    DBdict.settings['containerName'] = containerName;
    DBdict.settings['setupPath'] = setupPath;
    DBdict.settings['dnsProvider'] = dnsProvider;
    
    debugLog(`${arguments.callee.name}: Saving settings:`,DBdict.settings);
    await writeJson(DB_Settings, DBdict);
    return { success: true };
  } catch (error) {
    let backendError = 'Error saving settings';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// Function to retrieve logins
async function getLogins() {
  var DBdict = {};
  var logins = {};
  debugLog(`${arguments.callee.name}: start`);
  
  try {
    
    debugLog(`${arguments.callee.name}: calling DBdict readJson(${DB_Logins})`);
    DBdict = await readJson(DB_Logins);
    debugLog(`${arguments.callee.name}: DBdict:`, DBdict);
    
    // we could read DB_Logins and it is valid
    if (DBdict.constructor == Object && 'logins' in DBdict) {
      debugLog(`${arguments.callee.name}: Found ${Object.keys(DBdict['logins']).length} entries in DB_Logins`);
      return DBdict['logins'];
      
    // we could not read DB_Logins or it is invalid
    } else {
      console.log(`${arguments.callee.name}: ${DB_Logins} is empty`);
    }
    
    return logins;
    
  } catch (error) {
    let backendError = 'Error retrieving logins';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// Function to save logins
async function saveLogins(username, email, password) {
  DBdict = {logins:{}};
  try {
    DBdict.logins['username'] = username;
    DBdict.logins['email'] = email;
    DBdict.logins['password'] = password;
    
    debugLog(`${arguments.callee.name}: Saving logins:`,DBdict.logins);
    await writeJson(DB_Logins, DBdict);
    return { success: true };
  } catch (error) {
    let backendError = 'Error saving logins';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// Function to retrieve email accounts
async function getAccounts(refresh) {
  refresh = (refresh === undefined) ? false : refresh;
  debugLog(`${arguments.callee.name}: (refresh=${refresh})`);

  var DBdict = {};
  var accounts = [];
  
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
      // DBdict["accounts"] = accounts;
      DBdict = { ...DBdict, "accounts": accounts };
      // if (debug) console.debug('ddebug ----------------------------- DBdict',DBdict);
      
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

// Function to reindex an email account
async function reindexAccount(email) {
  try {
    debugLog(`${arguments.callee.name}: Reindexing email account: ${email}`);
    await execSetup(`doveadm index -u ${email} -q \\*`);
    debugLog(`${arguments.callee.name}: Account reindex started for ${email}`);
    return { success: true, email };
  } catch (error) {
    let backendError = 'Error reindexing account';
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}

// Function to retrieve aliases
async function getAliases(refresh) {
  refresh = (refresh === undefined) ? false : refresh;
  debugLog(`${arguments.callee.name}: start (refresh=${refresh})`);
  
  var DBdict = {};
  var aliases = [];
  
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


// function readDovecotConfFile will convert dovecot conf file syntax to JSON
function readDovecotConfFile(stdout) {
  // what we get
  /*
  mail_plugins = $mail_plugins fts fts_xapian
  plugin {
    fts = xapian
    fts_xapian = partial=3 full=20 verbose=0

    fts_autoindex = yes
    fts_enforced = yes
    # https://doc.dovecot.org/2.3/settings/plugin/fts-plugin/#plugin_setting-fts-fts_autoindex_max_recent_msgs
    # fts_autoindex_max_recent_msgs = 999

    # https://doc.dovecot.org/2.3/settings/plugin/fts-plugin/#plugin_setting-fts-fts_autoindex_exclude
    fts_autoindex_exclude = \Trash
    fts_autoindex_exclude2 = \Junk

    # https://doc.dovecot.org/2.3/settings/plugin/fts-plugin/#plugin_setting-fts-fts_decoder
    # fts_decoder = decode2text
  }
  service indexer-worker {
    # limit size of indexer-worker RAM usage, ex: 512MB, 1GB, 2GB
    vsz_limit = 2GB
  }
  */

  // what we want
  // plugin: {
    // fts: "xapian",
    // fts_xapian: "partial=3 full=20 verbose=0",
    // fts_autoindex: "yes",
    // fts_enforced: "yes",
    // fts_autoindex_exclude: "\Trash",
    // fts_autoindex_exclude2: "\Junk",
  // }

  // TODO: not capture trailing spaces in a set of words /[\s+]?=[\s+]?([\S\s]+)[\s+]?$/
  const regexConfComments = /^(\s+)?#(.*?)$/;
  // " mail_plugins = $mail_plugins fts fts_xapian ".replace(/(\s+)?(\S+)(\s+)?=(\s+)?([\S\s]+)(\s+)?$/, "'$2': '$5',") -> "'mail_plugins': '$mail_plugins fts fts_xapian ',"
  const regexConfDeclare = /(\s+)?(\S+)(\s+)?=(\s+)?([\S\s]+)(\s+)?$/;
  // " ssss indexer-worker { ".replace(/(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/, "'$2': $5") -> " 'ssss': {"
  const regexConfObjOpen = /(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/;
  const regexConfObjClose = /(\s+)?([\]\}])(\s+)?$/;
  const regexEmpty = /^\s*[\r\n]/gm;


  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  const cleanlines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(regexEmpty, '')
                         .replace(regexConfComments, '')
                         .replace(regexConfDeclare, '"$2": "$5",')
                         .replace(regexConfObjOpen, '"$2": $5')
                         .replace(regexConfObjClose, '$2,')
                         .trim();
    if (line) cleanlines.push(line);
  }

  const cleanData = `{${cleanlines.join('\n')}}`;
  if (debug) console.debug(`${arguments.callee.name}: cleanData:`, cleanData);

  try {
    const json = jsonFixTrailingCommas(cleanData, true);
    if (debug) console.debug(`${arguments.callee.name}: json:`, json);
    return json;
  } catch (error) {
    console.error(`${arguments.callee.name}: cleanData not valid JSON:`, error);
    return {};
  }
}

// Function to pull server status
async function pullServerStatus() {
  var DBdict = {};
  var status = {
    status: {
      status: 'stopped',
      Error: '',
      StartedAt: '',
      FinishedAt: '',
      Health: '',
    },
    resources: {
      cpu: '0%',
      memory: '0MB',
      disk: '0%',
    },
    env: {FTS_PLUGIN: "none", FTS_AUTOINDEX: 'no'},
  };

  try {
    debugLog(`${arguments.callee.name}: Pulling server status`);
    
    // Get container info
    const container = docker.getContainer(DMS_CONTAINER);
    const containerInfo = await container.inspect();
    // debugLog(`${arguments.callee.name}: ddebug containerInfo:`, containerInfo);

    // Check if container exist
    status.status.status = (containerInfo.Id) ? "stopped" : "missing";
    
    if ( status.status.status != "missing") {
      
      // Check if container is running
      const isRunning = containerInfo.State.Running === true;
      debugLog(`${arguments.callee.name}: Container running: ${isRunning} status.status=`,status.status);

      // get also errors and stuff
      status.status.Error = containerInfo.State.Error;
      status.status.StartedAt = containerInfo.State.StartedAt;
      status.status.FinishedAt = containerInfo.State.FinishedAt;
      status.status.Health = containerInfo.State.Health.Status;

      // get and conver DMS environment to dict
      dictEnvDMS = common.arrayOfStringToDict(containerInfo.Config.Env, '=');
      // debugLog(`${arguments.callee.name}: dictEnvDMS:`,dictEnvDMS);
      
      // we keep only some options not all
      dictEnvDMSredux = common.reduxPropertiesOfObj(dictEnvDMS, DMS_OPTIONS);
      // debugLog(`${arguments.callee.name}: dictEnvDMSredux:`,dictEnvDMSredux);
      // status['env'] = dictEnvDMSredux;
      status.env = { ...status.env, ...dictEnvDMSredux };

      // pull bindings and look for FTS
      containerInfo.Mounts.forEach( async (mount) => {
        if (debug) console.debug(`${arguments.callee.name}: found mount ${mount.Destination}`);
        if (mount.Destination.match(/fts.*\.conf$/i)) {
          // we found fts override plugin, let's load it
          try {
            const stdout = await execCommand(`cat ${mount.Destination}`);
            if (debug) console.debug(`${arguments.callee.name}: dovecot file content:`,stdout);
            const ftsConfig = readDovecotConfFile(stdout);
            if (debug) console.debug(`${arguments.callee.name}: dovecot json:`,ftsConfig);
            
            if (ftsConfig.plugin && ftsConfig.plugin.fts) {
              status.env.FTS_PLUGIN = ftsConfig.plugin.fts;
              status.env.FTS_AUTOINDEX = ftsConfig.plugin.fts_autoindex;
            }
          } catch (error) {
            console.error(`${arguments.callee.name}: execCommand failed with error:`,error);
          }
        }
      });
      
      
      // pull cpu stats if isRunning
      if (isRunning) {
        status.status.status = 'running';
        
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
        status.resources.cpuUsage = `${cpuPercent.toFixed(2)}%`;

        // Calculate memory usage
        const memoryUsageBytes = stats.memory_stats.usage;
        status.resources.memoryUsage = formatMemorySize(memoryUsageBytes);

        debugLog(`${arguments.callee.name}: Resources:`, status.resources);

        // For disk usage, we would need to run a command inside the container
        // This could be a more complex operation involving checking specific directories
        // For simplicity, we'll set this to "N/A" or implement a basic check
        status.resources.diskUsage = 'N/A';
      }
    }

    debugLog(`${arguments.callee.name}: Server pull status result:`, status);
    return status;
    
  } catch (error) {
    let backendError = `Server pull status error: ${error}`;
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    return {
      status: 'unknown',
      error: error.message,
    };
  }
}


// Function to check server status
async function getServerStatus(refresh) {
  refresh = (refresh === undefined) ? true : refresh;
  debugLog(`${arguments.callee.name}: (refresh=${refresh})`);
  
  var DBdict = {};
  var pulledStatus = {};
  var status = {
    name: 'dms-gui-backend',
    version: DMSGUI_VERSION,
    status: {
      status: 'unknown',
      Error: '',
      StartedAt: '',
      FinishedAt: '',
      Health: '',
    },
    resources: {
      cpu: '0%',
      memory: '0MB',
      disk: '0%',
    },
    internals: [
      { name: 'DMSGUI_VERSION', value: DMSGUI_VERSION },
      { name: 'HOSTNAME', value: HOSTNAME },
      { name: 'TZ', value: TZ },
      { name: 'NODE_VERSION', value: process.version },
      { name: 'NODE_ENV', value: NODE_ENV },
      { name: 'PORT_NODEJS', value: PORT_NODEJS },
    ],
    env: {FTS_PLUGIN: "none", FTS_AUTOINDEX: 'no'},
  };

  try {

    if (!refresh) {
      debugLog(`${arguments.callee.name}: read DBdict from ${DB_Status} (refresh=${refresh})`);
      DBdict = await readJson(DB_Status);
      // debugLog(`${arguments.callee.name}: DBdict:`, DBdict);
    }
    
    // we could read DB_Status and it is valid
    if (DBdict.constructor == Object && 'status' in DBdict) {
      debugLog(`${arguments.callee.name}: Found ${Object.keys(DBdict['status']).length} status in DBdict`);
      return DBdict['status'];
      
    // we could not read DB_Status or it is invalid, pull it from container (costly)
    } else {
      pulledStatus = await pullServerStatus();
      debugLog(`${arguments.callee.name}: got ${Object.keys(pulledStatus).length} pulledStatus from pullServerStatus()`);
    }
    
    // since we had to call pullServerStatus, we save DB_Status
    if (pulledStatus && Object.keys(pulledStatus).length) {
      status = { ...status, ...pulledStatus };
      DBdict["status"] = status;
      await writeJson(DB_Status, DBdict);
      
    // unknown error
    } else {
      console.error(`${arguments.callee.name}: error with read status:`, pulledStatus);
    }


    debugLog(`${arguments.callee.name}: Server read status result:`, pulledStatus);
    return DBdict.status;
    
  } catch (error) {
    let backendError = `Server read status error: ${error}`;
    let ErrorMsg = await formatError(backendError, error)
    console.error(`${arguments.callee.name}: ${backendError}:`, ErrorMsg);
    return {
      status: 'unknown',
      error: error.message,
    };
  }
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
  getLogins,
  saveLogins,
  reindexAccount,
};
// );


// interesting stuff to pull from containerInfo:
/*
State: {
  Status: 'running',
  Running: true,
  Paused: false,
  Restarting: false,
  OOMKilled: false,
  Dead: false,
  Pid: 1871534,
  ExitCode: 0,
  Error: '',
  StartedAt: '2025-10-05T23:17:51.535552398Z',
  FinishedAt: '0001-01-01T00:00:00Z',
  Health: { Status: 'healthy', FailingStreak: 0, Log: [Array] }
},
PortBindings: {
  '143/tcp': [Array],
  '25/tcp': [Array],
  '465/tcp': [Array],
  '587/tcp': [Array],
  '993/tcp': [Array]
},
Env: [
  'ENABLE_IMAP=1',
  'POSTFIX_INET_PROTOCOLS=ipv4',
  'ENABLE_UPDATE_CHECK=1',
  'DOVECOT_INET_PROTOCOLS=ipv4',
  'SSL_ALT_CERT_PATH=',
  'RSPAMD_HFILTER=1',
  'FETCHMAIL_POLL=300',
  'SASLAUTHD_LDAP_FILTER=',
  'DOVECOT_AUTH_BIND=',
  'SPAMASSASSIN_SPAM_TO_INBOX=1',
  'ENABLE_POSTGREY=0',
  'POSTGREY_TEXT=Delayed by Postgrey',
  'RSPAMD_CHECK_AUTHENTICATED=0',
  'SASLAUTHD_LDAP_PASSWORD_ATTR=',
  'MARK_SPAM_AS_READ=1',
  'SUPERVISOR_LOGLEVEL=info',
  'SASLAUTHD_LDAP_AUTH_METHOD=',
  'ENABLE_SPAMASSASSIN_KAM=1',
  'ENABLE_POP3=0',
  'LOGWATCH_INTERVAL=',
  'ENABLE_DNSBL=0',
  'AMAVIS_LOGLEVEL=0',
  'LDAP_SERVER_HOST=',
  'LDAP_BIND_DN=',
  'SRS_SENDER_CLASSES=envelope_sender',
  'POSTMASTER_ADDRESS=',
  'POSTGREY_AUTO_WHITELIST_CLIENTS=5',
  'DOVECOT_USER_FILTER=',
  'RSPAMD_LEARN=1',
  'LOGWATCH_SENDER=',
  'NETWORK_INTERFACE=',
  'ENABLE_SPAMASSASSIN=0',
  'SA_TAG=2.0',
  'TLS_LEVEL=modern',
  'RSPAMD_HFILTER_HOSTNAME_UNKNOWN_SCORE=6',
  'LOGROTATE_INTERVAL=weekly',
  'SRS_SECRET=',
  'SPOOF_PROTECTION=0',
  'SASLAUTHD_LDAP_SERVER=',
  'TZ=UTC',
  'OVERRIDE_HOSTNAME=',
  'ENABLE_OPENDKIM=0',
  'DEFAULT_RELAY_HOST=',
  'SASLAUTHD_LDAP_START_TLS=',
  'RSPAMD_GREYLISTING=1',
  'ENABLE_CLAMAV=0',
  'LDAP_BIND_PW=',
  'SASLAUTHD_LDAP_TLS_CACERT_DIR=',
  'SASLAUTHD_LDAP_TLS_CACERT_FILE=',
  'LDAP_QUERY_FILTER_DOMAIN=',
  'LDAP_SEARCH_BASE=',
  'SSL_KEY_PATH=/certs/key.pem',
  'SASLAUTHD_LDAP_PASSWORD=',
  'LDAP_QUERY_FILTER_GROUP=',
  'POSTGREY_DELAY=300',
  'SSL_TYPE=letsencrypt',
  'PERMIT_DOCKER=none',
  'PFLOGSUMM_TRIGGER=',
  'LOGROTATE_COUNT=4',
  'ENABLE_MANAGESIEVE=1',
  'LDAP_QUERY_FILTER_USER=',
  'SASLAUTHD_LDAP_TLS_CHECK_PEER=',
  'ENABLE_OAUTH2=',
  'DOVECOT_MAILBOX_FORMAT=maildir',
  'GETMAIL_POLL=5',
  'PFLOGSUMM_SENDER=',
  'POSTFIX_DAGENT=',
  'UPDATE_CHECK_INTERVAL=1d',
  'SASLAUTHD_LDAP_BIND_DN=',
  'REPORT_RECIPIENT=',
  'DOVECOT_PASS_FILTER=',
  'POSTSCREEN_ACTION=enforce',
  'POSTFIX_REJECT_UNKNOWN_CLIENT_HOSTNAME=0',
  'RSPAMD_NEURAL=0',
  'ENABLE_OPENDMARC=0',
  'RELAY_PORT=25',
  'POSTGREY_MAX_AGE=35',
  'SASLAUTHD_LDAP_SEARCH_BASE=',
  'PFLOGSUMM_RECIPIENT=',
  'MOVE_SPAM_TO_JUNK=1',
  'ENABLE_SASLAUTHD=0',
  'SASLAUTHD_LDAP_MECH=',
  'RELAY_PASSWORD=',
  'LOGWATCH_RECIPIENT=audioscavenger@gmail.com',
  'SASLAUTHD_MECH_OPTIONS=',
  'DMS_VMAIL_UID=',
  'SASLAUTHD_MECHANISMS=',
  'POSTFIX_MAILBOX_SIZE_LIMIT=5242880000',
  'ENABLE_SRS=0',
  'SA_KILL=10.0',
  'LDAP_QUERY_FILTER_ALIAS=',
  'POSTFIX_MESSAGE_SIZE_LIMIT=314572800',
  'ENABLE_QUOTAS=1',
  'RELAY_HOST=',
  'FAIL2BAN_BLOCKTYPE=drop',
  'OAUTH2_INTROSPECTION_URL=',
  'ENABLE_AMAVIS=0',
  'ENABLE_GETMAIL=0',
  'ENABLE_FETCHMAIL=0',
  'ENABLE_RSPAMD=1',
  ... 22 more items
],
*/

