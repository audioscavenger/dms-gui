require('./env.js');
const {
  docker,
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  byteSize2HumanSize,
  humanSize2ByteSize,
  jsonFixTrailingCommas,
  formatDMSError,
  reduxPropertiesOfObj,
  execSetup,
  execCommand,
  readJson,
  writeJson,
  getContainer,
} = require('./backend.js');
const {
  sql,
  dbRun,
  dbAll,
  dbGet,
  hashPassword,
  verifyPassword,
} = require('./db.js');

const fs = require("fs");
const fsp = fs.promises;


async function getAccounts(refresh, containerName) {
  refresh = (refresh === undefined) ? false : refresh;
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`(refresh=${refresh} for ${containerName}`);
  
  let accounts = [];
  try {
    
    if (!refresh) {
      accounts = await dbAll(sql.accounts.select.accounts, containerName);
      
      // we could read DB_Logins and it is valid
      if (accounts && accounts.length) {
        infoLog(`Found ${accounts.length} entries in accounts`);
        
        // now JSON.parse storage as it's stored stringified in the db
        accounts = accounts.map(account => { return { ...account, storage: JSON.parse(account.storage) }; });
        
      } else {
        warnLog(`db seems empty:`, accounts);
      }
      
      return accounts;
      // [ { mailbox: 'a@b.com', domain:'b.com', storage: {} }, .. ]
    }
    
    // refresh
    accounts = await pullAccountsFromDMS(containerName);
    // [{ mailbox: 'a@b.com', storage: {} }, .. ]
    infoLog(`got ${accounts.length} accounts from pullAccountsFromDMS(${containerName})`);

    // now add the domain item
    accounts = accounts.map(account => { return { ...account, domain: account.mailbox.split('@')[1] }; });

    // now save accounts in db
    let accountsDb = accounts.map(account => { return { ...account, storage: JSON.stringify(account.storage) }; });
    dbRun(sql.accounts.insert.fromDMS, accountsDb, containerName);
    
    return accounts;
    
  } catch (error) {
    let backendError = `${error.message}`;
    errorLog(backendError);
    throw new Error(backendError);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}


// Function to retrieve mailbox accounts from DMS
async function pullAccountsFromDMS(containerName) {
  const command = 'email list';
  const accounts = [];
  
  try {
    debugLog(`execSetup(${command})`);
    const result = await execSetup(command, containerName);
    if (!result.exitCode) {
    
      // Parse multiline output with regex to extract email and size information
      // const emailLineValidChars = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/g;
      const emailLineValidChars = /[^\w\.\~\.\-_@\s\*\%]/g;
      // const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\.\S+)\s+\(\s+([\w\.\~]+)\s+\/\s+([\w\.\~]+)\s+\)\s+\[(\d+)%\]/;
      const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\S+)\s+([\w\.\~]+)\s+([\w\.\~]+)\s+(\d+)%/;
      const accountLineRegexQuotaOFF = /(\*\s+)(\S+)@(\S+\S+)/;

      // Process each line individually
      const lines = result.stdout.split('\n').filter((line) => line.trim().length > 0);
      // debugLog(`email list RAW response:`, lines);

      for (let i = 0; i < lines.length; i++) {
        debugLog(`email list line RAW  :`, lines[i]);
        
        // Clean the line from binary control characters
        const line = lines[i].replace(emailLineValidChars, '').trim();
        debugLog(`email list line CLEAN:`, line);

        // Check if line contains * which indicates an account entry
        if (line.includes('*')) {
          const matchQuotaON  = line.match(accountLineRegexQuotaON);
          const matchQuotaOFF = line.match(accountLineRegexQuotaOFF);

          if (matchQuotaON) {
            // matchQuotaON = [ "* user@domain.com ( 2.5G / 30G ) [8%]", "* ", "user", "domain.com", "2.5G", "30G", "8" ]
            // matchQuotaON = [ "* user@domain.com 2.5G 30G 8%", "* ", "user", "domain.com", "2.5G", "30G", "8" ]
            const mailbox = `${matchQuotaON[2]}@${matchQuotaON[3]}`;
            
            // this works only if Dovecot ENABLE_QUOTAS=1
            const usedSpace = matchQuotaON[4];
            const totalSpace = matchQuotaON[5] === '~' ? 'unlimited' : matchQuotaON[5];
            const usagePercent = matchQuotaON[6];

            debugLog(`Parsed account: ${mailbox}, Storage: ${usedSpace}/${totalSpace} [${usagePercent}%]`);

            accounts.push({
              mailbox:mailbox,
              storage: {
                used: usedSpace,
                total: totalSpace,
                percent: usagePercent,
              },
            });
          } else if  (matchQuotaOFF) {
            // matchQuotaOFF = [ "* user@domain.com", "* ", "user", "domain.com" ]
            const mailbox = `${matchQuotaOFF[2]}@${matchQuotaOFF[3]}`;

            accounts.push({
              mailbox:mailbox,
              storage: {},
            });
          } else {
            warnLog(`Failed to parse account line: ${line}`);
          }
        }
      }
    } else errorLog(result.stderr);

    debugLog(`Found ${accounts.length} accounts`, accounts);
    return accounts;
    
  } catch (error) {
    let backendError = `Error execSetup(${command}): ${error}`;
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// Function to add a new mailbox account
async function addAccount(mailbox, password, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`(refresh=${refresh} for ${containerName}`);

  try {
    debugLog(`Adding new mailbox account: ${mailbox}`);
    const result = await execSetup(`email add ${mailbox} ${password}`);
    if (!result.exitCode) {
      
      const { salt, hash } = await hashPassword(password);
      dbRun(sql.accounts.insert.fromGUI, { mailbox:mailbox, domain:mailbox.split('@')[1], salt:salt, hash:hash }, containerName);
      successLog(`Account created: ${mailbox}`);
      return { success: true };
      
    } else errorLog(result.stderr);
    
  } catch (error) {
    let backendError = 'Error adding account';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

// Function to update an mailbox account password
async function changePasswordAccount(mailbox, password, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    debugLog(`Updating password for account: ${mailbox}`);
    const result = await execSetup(`email update ${mailbox} ${password}`);
    if (!result.exitCode) {
      
      const { salt, hash } = await hashPassword(password);
      dbRun(sql.accounts.update.password, { mailbox:mailbox, salt:salt, hash:hash }, containerName);
      successLog(`Password updated for account: ${mailbox}`);
      return { success: true };
      
    } else errorLog(result.stderr);
    
  } catch (error) {
    let backendError = 'Error updating account password';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

async function updateAccount(mailbox, jsonDict, containerName) {
  // jsonDict = {password:password}
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    if (Object.keys(jsonDict).length = 0) {
      throw new Error('nothing to modify was passed');
    }
    
    debugLog(`Updating account ${mailbox} with jsonDict:`, jsonDict);
    let validDict = reduxPropertiesOfObj(jsonDict, Object.keys(updateValidKeys.accounts));
    if (Object.keys(validDict).length = 0) {
      throw new Error('nothing valid was passed');
    }
    
    debugLog(`Updating account ${mailbox} with validDict:`, validDict);
    for (const [key, value] of Object.entries(validDict)) {
      if (key == 'password') {
        return changePasswordAccount(mailbox, value);
        
      } else if (key == 'storage') {
        dbRun(sql.accounts.update[key], {[key]:JSON.stringify(value)}, containerName, mailbox);
        debugLog(`Updated account ${mailbox} with ${key}=${value}`);
        return { success: true };
        
      } else {
        dbRun(sql.accounts.update[key], {[key]:value}, containerName, mailbox);
        debugLog(`Updated account ${mailbox} with ${key}=${value}`);
        return { success: true };
      }
    }
    
  } catch (error) {
    let backendError = 'Error updating account';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

// Function to delete an mailbox account
async function deleteAccount(mailbox, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    debugLog(`Deleting mailbox account: ${mailbox}`);
    const result = await execSetup(`email del ${mailbox}`);
    if (!result.exitCode) {
      
      dbRun(sql.accounts.delete.account, containerName, mailbox);
      successLog(`Account deleted: ${mailbox}`);
      return { success: true };
      
    } else errorLog(result.stderr);
    
  } catch (error) {
    let backendError = 'Error deleting account';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

// Function to reindex an mailbox account
async function reindexAccount(mailbox, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    debugLog(`Reindexing mailbox account: ${mailbox}`);
    const result = await execSetup(`doveadm index -u ${mailbox} -q \\*`);
    if (!result.exitCode) {
      
      successLog(`Account reindex started for ${mailbox}`);
      return { success: true };
      
    } else errorLog(result.stderr);
    
  } catch (error) {
    let backendError = 'Error reindexing account';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
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
  updateAccount,
  deleteAccount,
};


