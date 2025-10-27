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
} = require('./backend');

const {
  sql,
  dbRun,
  dbAll,
  dbGet,
  hashPassword,
} = require('./db');

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
    errorLog(`${backendError}:`, ErrorMsg);
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
    errorLog(`${backendError}:`, ErrorMsg);
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
    errorLog(`${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

// doveadm function
// https://doc.dovecot.org/2.4.1/core/admin/doveadm.html
async function doveadm(command, mailbox, jsonDict={}, containerName) {   // jsonDict = {field:"messages unseen vsize", box:"INBOX Junk"}
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}: ${command} ${mailbox}`, jsonDict);

  const doveadm = {
    reindex: {    // https://doc.dovecot.org/main/core/man/doveadm-index.1.html
      mailbox: true,
      cmd: 'doveadm index -u {mailbox} -q \\*',
      stdout: false,
      messages: {
        pass: 'Reindexing started for {mailbox}',
      },
    },
    list: {   // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20list
      mailbox: true,
      cmd: 'doveadm mailbox list -u {mailbox}',
      stdout: true,
      messages: {
        pass: 'Folder list for {mailbox}:',
      },
      // Junk
      // Drafts
      // Trash
      // Sent
      // INBOX
    },
    subscribed: {   // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20list
      mailbox: true,
      cmd: 'doveadm mailbox list -u {mailbox} -s',
      stdout: true,
      messages: {
        pass: 'Subscribed folder list for {mailbox}:',
      },
      // Junk
      // Drafts
      // Trash
      // Sent
    },
    metaGet: {   // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20metadata%20list https://manpages.ubuntu.com/manpages/jammy/man1/doveadm-mailbox.1.html
      mailbox: true,
      cmd: 'doveadm mailbox metadata list -p -u {mailbox} {box}',
      defaults: {
        box: 'INBOX',
      },
      stdout: true,
      messages: {
        pass: 'Metadata list for {mailbox}/{box}:',
      },
      // /private/specialuse
      // /shared/vendor/vendor.dovecot/pvt/server/admin
      // /shared/vendor/vendor.dovecot/pvt/server/comment
    },
    status: {   // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20status
      mailbox: true,
      cmd: 'doveadm mailbox status -u {mailbox} {field} {box}',
      defaults: {
        field: 'all',
        box: 'INBOX',
      },
      stdout: true,
      messages: {
        pass: 'Status from {mailbox}/{box}:',
      },
      // INBOX messages=5119 recent=0 uidnext=5125 uidvalidity=1759246520 unseen=703 highestmodseq=356 vsize=459768297 guid=68e18d2db8f8db68550f00008e1fe135 firstsaved=1759247564
    },
    resync: {   // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20status
      mailbox: true,
      cmd: 'doveadm force-resync -u {mailbox} --mailbox-mask {box}',
      defaults: {
        box: 'INBOX',
      },
      stdout: false,
      messages: {
        pass: 'Force-resync started for {mailbox}/{box}',
      },
      // doveadm(user@domain.com): Info: FTS Xapian: Optimize (1) : Checking expunges from db_6076763531fadb68571400008e1fe135_exp.db
      // doveadm(user@domain.com): Info: FTS Xapian: Optimize (1) : Checking expunges from db_e170c41cf00be3687d3400008e1fe135_exp.db
    },
  }

  try {
    if (!doveadm[command]) throw new Error(`unknown command: ${command}`);
    
    let formattedCommand = doveadm[command].cmd.replace(/{mailbox}/g, mailbox);
    let formattedPass    = doveadm[command].messages.pass.replace(/{mailbox}/g, mailbox);
    // also apply whatever is in the jsonDict if anything like fields or mailboxes... and also apply defaults if any
    // by parsing the defaults instead of the jsonDict, we also ensure only valid keys are replaced
    if (doveadm[command]?.defaults) {
      for (const [key, defaultValue] of Object.entries(doveadm[command].defaults)) {
        formattedCommand = (jsonDict[key]) ? formattedCommand.replace(`{${key}}`, jsonDict[key]) : formattedCommand.replace(`{${key}}`, defaultValue);
        formattedPass = (jsonDict[key]) ? formattedPass.replace(`{${key}}`, jsonDict[key]) : formattedPass.replace(`{${key}}`, defaultValue);
      }
    }
    
    const result = await execCommand(formattedCommand);
    if (!result.exitCode) {
      
      successLog(formattedPass, result.stdout);
      return { success: true, result: result.stdout };
      
    } else errorLog(result.stderr);
    
  } catch (error) {
    let backendError = `${error.message}`;
    errorLog(backendError);
    throw new Error(backendError);
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
  deleteAccount,
  doveadm,
};


