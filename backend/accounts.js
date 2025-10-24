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


async function getAccount(name, containerName) {  // TODO: do we need that?
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    
    const account = await dbGet(sql.accounts.select.account, containerName, name);
    return account?.value;
    
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


async function getAccounts(refresh, containerName) {
  refresh = (refresh === undefined) ? false : refresh;
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`(refresh=${refresh} for ${containerName}`);
  
  var accounts = [];
  try {
    
    if (!refresh) {
      accounts = await dbAll(sql.accounts.select.accounts, containerName);
      
      // we could read DB_Logins and it is valid
      if (accounts && accounts.length) {
        infoLog(`Found ${accounts.length} entries in accounts`);
        
        // now parse storage JSON as it's stored stringified in the db
        accounts = accounts.map(account => { return { ...account, storage: JSON.parse(account.storage) }; });
        
      } else {
        warnLog(`db seems empty:`, accounts);
      }
      
      return accounts;
      // [ { email: 'a@b.com', domain:'b.com', storage: {} }, .. ]
    }
    
    // refresh
    accounts = await pullAccountsFromDMS(containerName);
    // [{ email: 'a@b.com', storage: {} }, .. ]
    infoLog(`got ${accounts.length} accounts from pullAccountsFromDMS(${containerName})`);

    // now add the domain item
    accounts = accounts.map(account => { return { ...account, domain: account.email.split('@')[1] }; });

    // now save accounts in db
    let accountsDb = accounts.map(account => { return { ...account, storage: JSON.stringify(account.storage) }; });
    dbRun(sql.accounts.insert.account, accountsDb, containerName);
    
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


// Function to retrieve email accounts from DMS
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
            const email = `${matchQuotaON[2]}@${matchQuotaON[3]}`;
            
            // this works only if Dovecot ENABLE_QUOTAS=1
            const usedSpace = matchQuotaON[4];
            const totalSpace = matchQuotaON[5] === '~' ? 'unlimited' : matchQuotaON[5];
            const usagePercent = matchQuotaON[6];

            debugLog(`Parsed account: ${email}, Storage: ${usedSpace}/${totalSpace} [${usagePercent}%]`);

            accounts.push({
              email:email,
              storage: {
                used: usedSpace,
                total: totalSpace,
                percent: usagePercent,
              },
            });
          } else if  (matchQuotaOFF) {
            // matchQuotaOFF = [ "* user@domain.com", "* ", "user", "domain.com" ]
            const email = `${matchQuotaOFF[2]}@${matchQuotaOFF[3]}`;

            accounts.push({
              email:email,
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


// Function to add a new email account
async function addAccount(email, password, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`(refresh=${refresh} for ${containerName}`);

  try {
    debugLog(`Adding new email account: ${email}`);
    const result = await execSetup(`email add ${email} ${password}`);
    if (!result.exitCode) {
      
      const { salt, hash } = await hashPassword(password);
      dbRun(sql.accounts.insert.account, { email:email, salt:salt, hash:hash, domain:email.split('@')[1] }, containerName);
      successLog(`Account created: ${email}`);
      return { success: true, email };
      
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

// Function to update an email account password
async function changePasswordAccount(email, password, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    debugLog(`Updating password for account: ${email}`);
    const result = await execSetup(`email update ${email} ${password}`);
    if (!result.exitCode) {
      
      const { salt, hash } = await hashPassword(password);
      dbRun(sql.accounts.update.password, { email:email, salt:salt, hash:hash }, containerName);
      successLog(`Password updated for account: ${email}`);
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

async function updateAccount(email, jsonDict) {
  // jsonDict = {password:password}
  
  try {
    if (Object.keys(jsonDict).length = 0) {
      throw new Error('nothing to modify was passed');
    }
    
    debugLog(`Updating account ${email} with jsonDict:`, jsonDict);
    let validDict = reduxPropertiesOfObj(jsonDict, Object.keys(validKeys.accounts));
    if (Object.keys(validDict).length = 0) {
      throw new Error('nothing valid was passed');
    }
    
    debugLog(`Updating account ${email} with validDict:`, validDict);
    for (const [key, value] of Object.entries(validDict)) {
      if (key == 'password') {
        return changePasswordAccount(email, value);
      } else {
        dbRun(sql.accounts.update.any, key, value, email);
        debugLog(`Updated account ${email} with ${key}=${value}`);
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

// Function to delete an email account
async function deleteAccount(email, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    debugLog(`Deleting email account: ${email}`);
    const result = await execSetup(`email del ${email}`);
    if (!result.exitCode) {
      
      dbRun(sql.accounts.delete.account, containerName, email);
      successLog(`Account deleted: ${email}`);
      return { success: true, email };
      
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

// Function to reindex an email account
async function reindexAccount(email, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    debugLog(`Reindexing email account: ${email}`);
    const result = await execSetup(`doveadm index -u ${email} -q \\*`);
    if (!result.exitCode) {
      
      successLog(`Account reindex started for ${email}`);
      return { success: true, email };
      
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


