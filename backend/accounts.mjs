// import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailStrict,
//   regexEmailStrict,
//   regexMatchPostfix,
//   regexUsername,
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
//   getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
// } from '../common.mjs'
import {
  reduxArrayOfObjByValue,
} from '../common.mjs';
import {
  deleteAlias,
  getAliases,
} from './aliases.mjs';
import {
  debugLog,
  errorLog,
  execDMS,
  formatDMSError,
  infoLog,
  successLog,
  warnLog
} from './backend.mjs';
import {
  env
} from './env.mjs';

import {
  dbAll,
  dbRun,
  deleteEntry,
  getTargetDict,
  hashPassword,
  sql
} from './db.mjs';
import { addLogin, getLogin } from './logins.mjs';
import { getConfigs } from './settings.mjs';


export const getAccounts = async (containerName=null, refresh=false, roles=[]) => {
  debugLog(containerName, refresh, roles);
  // if (!containerName) return {success: false, error: 'containerName is needed'};   // accounts table does not store mailserver, why would that be required?
  refresh = env.isDEMO ? false : refresh;
  
  let result, config;
  let accounts = [];
  let password = '';

  try {
    
    // refresh only possible if containerName is passed
    if (refresh && containerName) {

      // get schema
      // getConfigs(plugin, roles=[], name=undefined)
      result = await getConfigs('mailserver', roles, containerName);
      // message: [
      //   {
      //     value: 'dms',
      //     plugin: 'mailserver',
      //     schema: 'dms',
      //     scope: 'dms-gui'
      //   }
      // ]

      if (result.success) {
        config = result.message[0];

        if (config?.schema == 'dms') {
          result = await pullAccountsFromDMS(containerName);
        } else {
          errorLog(`unknown schema: ${config?.schema}`, result);
          throw new Error(`unknown schema: ${config?.schema}`);
        }

        if (result.success) {
          // [{ mailbox: 'a@b.com', storage: {} }, .. ]
          infoLog(`got ${result.message.length} accounts from pullAccountsFromDMS(${containerName})`);

          // create a dupe with stringified storage and scope for saving in db
          let accounts2save = result.message.map(account => { return {
            ...account, 
            domain: account.mailbox.split('@')[1],
            storage: JSON.stringify(account?.storage), 
            }; 
          });
          debugLog('ddebug accounts2save', accounts2save);

          // now save/refresh ALL accounts in db since we cannot filter by mailbox, DMS always returns the full list. We just don't have a choice
          // fromDMS:  `REPLACE INTO accounts (mailbox, domain, storage, configID)     VALUES (@mailbox, @domain, @storage, (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = ?))`,
          result = dbRun(sql.accounts.insert.fromDMS, accounts2save, containerName);
          if (result.success) {
            
            // also create matching linked logins with extra fields, exclude isAdmin and isActive, in case it already exists
            // let logins2create = result.message.map(account => { return {
            //   mailbox:account.mailbox, 
            //   username:account.mailbox, 
            //   email:account.mailbox, 
            //   isAccount:1, 
            //   mailserver:containerName, 
            //   roles:JSON.stringify([account.mailbox]), 
            //   }; 
            // });

            // now save those linked logins in db / deprecated: let's use addLogin instead
            // fromDMS:  `REPLACE INTO logins  (mailbox, username, email, isAccount, mailserver, roles) VALUES (@mailbox, @username, @email, @isAccount, @mailserver, @roles)`,
            // result = dbRun(sql.logins.insert.fromDMS, logins2create);

            for (const account of accounts) {

              result = await getLogin(account.mailbox, true); // search if login exist by mailbox
              if (!result.success) {

                result = await addLogin(account.mailbox, account.mailbox, password, account.mailbox, 0, 1, 1, containerName, [account.mailbox]);
                if (!result.success) {
                  errorLog('addLogin:', result?.error);
                }

              } else debugLog(`login with mailbox=${account.mailbox} already exist`);
            }
            
          } else errorLog('sql.accounts.insert.fromDMS:', result?.error);
          
        } else errorLog('pullAccountsFromDMS:', result?.error);

      } else errorLog(`getConfigs: ${containerName} not found`);
    }
    
    // now pull accounts from the db as we need associated logins for the DataTable
    // accounts: `SELECT a.mailbox, a.domain, a.storage, l.username 
    //            FROM accounts a 
    //            LEFT JOIN config c ON c.id = a.configID 
    //            LEFT JOIN logins l ON l.mailbox = a.mailbox 
    //            WHERE 1=1 
    //            AND c.plugin = 'mailserver' 
    //            AND c.name = ? 
    //            ORDER BY a.domain, a.mailbox`,
    result = dbAll(sql.accounts.select.accounts, {}, containerName);
    if (result.success) {
      
      // reduce the list of accounts down to a shortlist when provided
      if (roles.length) result.message = reduxArrayOfObjByValue(result.message, 'mailbox', roles);

      // we could read filtered accounts from accounts table
      if (result.message.length) {
        infoLog(`Found ${result.message.length} entries in accounts`);
        
        // now JSON.parse storage for the UI as it's stored stringified in the db
        accounts = result.message.map(account => { return { 
          ...account, 
          storage: JSON.parse(account?.storage) 
          }; 
        });
        
      } else warnLog(`db accounts seems empty:`, result.message);

      return {success: true, message: accounts};
      // [ { mailbox: 'a@b.com', domain:'b.com', storage: {} }, .. ]

    // unknown error
    } else errorLog(result?.error);
    
    return result;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// Function to retrieve mailbox accounts from DMS
export const pullAccountsFromDMS = async (containerName=null) => {
  if (!containerName) return {success: false, error: 'containerName is null'};
  const command = 'email list';
  let accounts = [];
  
  try {
    const targetDict = getTargetDict('mailserver', containerName);

    debugLog(`execDMS(${command})`, targetDict);
    const results = await execDMS(command, targetDict);
    if (!results?.returncode) {
    
      // Parse multiline output with regex to extract email and size information
      // const emailLineValidChars = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/g;
      const emailLineValidChars = /[^\w\.\~\.\-_@\s\*\%]/g;
      // const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\.\S+)\s+\(\s+([\w\.\~]+)\s+\/\s+([\w\.\~]+)\s+\)\s+\[(\d+)%\]/;
      const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\S+)\s+([\w\.\~]+)\s+([\w\.\~]+)\s+(\d+)%/;
      const accountLineRegexQuotaOFF = /(\*\s+)(\S+)@(\S+\S+)/;

      // Process each line individually
      const lines = results.stdout.split('\n').filter((line) => line.trim().length > 0);
      // debugLog(`email list RAW response:`, lines);

      for (let i = 0; i < lines.length; i++) {
        // debugLog(`email list RAW line    :`, lines[i]);
        
        // Clean the line from binary control characters
        const line = lines[i].replace(emailLineValidChars, '').trim();
        // debugLog(`email list CLEAN line  :`, line);

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
      
    } else {
      let ErrorMsg = await formatDMSError('execDMS', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg, returncode: results?.returncode };
    }

    debugLog(`Found ${accounts.length} accounts`, accounts);
    return { success: true, message: accounts };
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }
};

// Function to add a new mailbox account
// it create both an account and a login with password in the db, but for isAccout linked users, will never be used
// TODO: do we want to save passwords also in accounts table? for what purpose?
export const addAccount = async (schema='dms', containerName=null, mailbox=null, password=null, createLogin=1) => {
  if (!password) return {success: false, error: 'password is null'};
  if (!mailbox) return {success: false, error: 'mailbox is null'};
  if (!containerName) return {success: false, error: 'containerName is null'};
  let result, results;

  try {
    const targetDict = getTargetDict('mailserver', containerName);

    debugLog(`Adding new mailbox account for ${containerName}: ${mailbox}`);
    if (schema == 'dms') results = await execDMS(`email add ${mailbox} '${password}'`, targetDict);

    if (!results?.returncode) {
      
      const { salt, hash } = await hashPassword(password);
      result = dbRun(sql.accounts.insert.fromGUI, { mailbox:mailbox, domain:mailbox.split('@')[1], salt:salt, hash:hash}, containerName);
      if (result.success) {
        successLog(`Account created: ${mailbox}`);
        
        if (createLogin) {

          result = await getLogin(mailbox, true); // search if login exist by mailbox
          if (!result.success) {

            // result = dbRun(sql.logins.insert.login, { email:mailbox, username:mailbox, salt:salt, hash:hash, isAdmin:0, isAccount:1, isActive:1, roles:JSON.stringify([mailbox]), scope:containerName});
            result = await addLogin(mailbox, mailbox, password, mailbox, 0, 1, 1, containerName, [mailbox]);
            if (result.success) {
              successLog(`addLogin created: ${mailbox}`);

            } else {
              errorLog(`addLogin error: ${mailbox}: ${result?.error}`);
            } // login created

          } else infoLog(`addLogin:${mailbox} already exist`);
        
        } // also create login
        
      } // account created
      return result;
      
    } else {
      let ErrorMsg = await formatDMSError('addAccount', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg, returncode: results?.returncode};
    }
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// Function to delete an mailbox account; shema is needed because of the remote command involved
export const deleteAccount = async (schema='dms', containerName=null, mailbox=null) => {
  if (!mailbox) return {success: false, error: 'containerName is null'};
  if (!containerName) return {success: false, error: 'containerName is null'};

  let result, results;
  try {
    const targetDict = getTargetDict('mailserver', containerName);

    // dms setup could take who know how long when mailbox is large
    targetDict.timeout = 60;
    if (schema == 'dms') results = await execDMS(`email del -y ${mailbox}`, targetDict);
    debugLog('ddebug execDMS', results)

    if (!results?.returncode) {
      successLog(`Mailbox Account deleted: ${mailbox}`);
      
      result = await deleteEntry('accounts', mailbox, 'mailbox', containerName);
      debugLog('ddebug deleteEntry',result)
      if (result.success) {
        successLog(`db entry deleted: ${mailbox}`);

        // now delete aliases too
        result = await getAliases(containerName, false, [mailbox]);
        debugLog('ddebug getAliases',result)
        if (result.success && result.message.length) {

          for (const alias of result.message) {
            result = await deleteAlias(containerName, alias.source, alias.destination);
            debugLog(`ddebug deleteAlias=${result.success}`,alias.source)
            if (result.success) {
              successLog(`alias deleted: ${alias.source} -> ${alias.destination}`);
            } else warnLog(`alias delete failed: ${alias.source} -> ${alias.destination}`);
          }
        }
        
      } else warnLog(`Failed to delete Account: ${mailbox}`, result.message);

      return result;
      
    } else {
      let ErrorMsg = await formatDMSError('execDMS', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg, returncode: results?.returncode };
    }
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};

// COMMAND email :=
//     setup email add <EMAIL ADDRESS> [<PASSWORD>]
//     setup email update <EMAIL ADDRESS> [<PASSWORD>]
//     setup email del [ OPTIONS... ] <EMAIL ADDRESS> [ <EMAIL ADDRESS>... ]
//     setup email restrict <add|del|list> <send|receive> [<EMAIL ADDRESS>]
//     setup email list
// Function to update a mailbox password; shema is needed because of the remote command involved
export const updateAccount = async (schema='dms', containerName=null, mailbox=null, password=null) => {
  if (!password) return {success: false, error: 'password is null'};
  if (!mailbox) return {success: false, error: 'containerName is null'};
  if (!containerName) return {success: false, error: 'containerName is null'};

  let results;
  try {
    const targetDict = getTargetDict('mailserver', containerName);

    // dms setup could take who know how long sowe increase it a little
    targetDict.timeout = 6;
    if (schema == 'dms') results = await execDMS(`email update ${mailbox} '${password}'`, targetDict);
    debugLog('ddebug execDMS', results);  // { returncode: 0, stdout: '', stderr: '' }

    if (!results?.returncode) {
      successLog(`Password updated for ${mailbox}`);
      return { success: true, message: `Password updated for ${mailbox}` };
      
    } else {
      let ErrorMsg = await formatDMSError('execDMS', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg, returncode: results?.returncode };
    }
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};

// module.exports = {
//   getAccounts,
//   addAccount,
//   deleteAccount,
//   doveadm,
// };


