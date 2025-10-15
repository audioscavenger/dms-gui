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

        // we could read DB_Accounts and it is valid
        if (DBdict.constructor == Object && 'accounts' in DBdict) {
          debugLog(`${arguments.callee.name}: Found ${DBdict['accounts'].length} accounts in DBdict`);
          return DBdict['accounts'];
        }
        
      // we could not read DB_Accounts or it is invalid
      }

    // force refresh if no db
    if (!DBdict.accounts) {
        accounts = await getAccountsFromDMS();
        debugLog(`${arguments.callee.name}: got ${accounts.length} accounts from getAccountsFromDMS()`);
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
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
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

// Function to update an email account password
async function updateAccountPassword(email, password) {
  try {
    debugLog(`${arguments.callee.name}: Updating password for account: ${email}`);
    await execSetup(`email update ${email} ${password}`);
    debugLog(`${arguments.callee.name}: Password updated for account: ${email}`);
    return { success: true, email };
  } catch (error) {
    let backendError = 'Error updating account password';
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

// Function to delete an email account
async function deleteAccount(email) {
  try {
    debugLog(`${arguments.callee.name}: Deleting email account: ${email}`);
    await execSetup(`email del ${email}`);
    debugLog(`${arguments.callee.name}: Account deleted: ${email}`);
    return { success: true, email };
  } catch (error) {
    let backendError = 'Error deleting account';
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

// Function to reindex an email account
async function reindexAccount(email) {
  try {
    debugLog(`${arguments.callee.name}: Reindexing email account: ${email}`);
    await execSetup(`doveadm index -u ${email} -q \\*`);
    debugLog(`${arguments.callee.name}: Account reindex started for ${email}`);
    return { success: true, email };
  } catch (error) {
    let backendError = 'Error reindexing account';
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
  getAccounts,
  addAccount,
  updateAccountPassword,
  deleteAccount,
};


