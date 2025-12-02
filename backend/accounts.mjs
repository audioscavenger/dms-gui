// import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailRegex,
//   regexFindEmailStrict,
//   regexFindEmailLax,
//   regexEmailRegex,
//   regexEmailStrict,
//   regexEmailLax,
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
  execCommand,
  execSetup,
  formatDMSError,
  infoLog,
  successLog,
  warnLog,
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


export const getAccounts = async (schema, containerName, refresh, roles=[]) => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};
  refresh = (refresh === undefined) ? false : (env.isDEMO ? false : refresh);
  
  let result;
  let accounts = [];
  try {
    
    // refresh
    if (refresh) {
      if (schema == 'dms') result = await pullAccountsFromDMS(containerName);

      if (result.success) {
        // [{ mailbox: 'a@b.com', storage: {} }, .. ]
        infoLog(`got ${result.message.length} accounts from pullAccountsFromDMS(${containerName})`);

        // now add the domain item, st
        accounts = result.message.map(account => { return { ...account, domain: account.mailbox.split('@')[1] }; });

        // create a dupe with stringified storage and scope for saving in db
        let accounts2save = accounts.map(account => { return {
          ...account, 
          storage: JSON.stringify(account?.storage), 
          scope:containerName 
          }; 
        });
        // now save accounts in db
        result = dbRun(sql.accounts.insert.fromDMS, accounts2save);
        if (result.success) {
          
          // also create matching linked logins with extra fields, exclude isAdmin and isActive, in case it already exists
          let logins2create = accounts.map(account => { return {
            mailbox:account.mailbox, 
            username:account.mailbox, 
            email:account.mailbox, 
            isAccount:1, 
            favorite:containerName, 
            roles:JSON.stringify([account.mailbox]), 
            scope:containerName
            }; 
          });
          // now save those linked logins in db
          result = dbRun(sql.logins.insert.fromDMS, logins2create);
          if (!result.success) errorLog(result.error);
          
        } else errorLog(result.error);
        
        if (roles.length) accounts = reduxArrayOfObjByValue(accounts, 'mailbox', roles);

      } else errorLog(result.error);
    }
    
    // now pull accounts from the db as we need to associated logins for the DataTable
    result = dbAll(sql.accounts.select.accounts, {scope:containerName});
    if (result.success) {
      
      // we could read DB_Logins and it is valid
      if (result.message.length) {
        infoLog(`Found ${result.message.length} entries in accounts`);
        
        // now JSON.parse storage as it's stored stringified in the db
        accounts = result.message.map(account => { return { ...account, storage: JSON.parse(account?.storage) }; });
        
      } else warnLog(`db accounts seems empty:`, result.message);

      if (roles.length) accounts = reduxArrayOfObjByValue(accounts, 'mailbox', roles);
      return {success: true, message: accounts};
      // [ { mailbox: 'a@b.com', domain:'b.com', storage: {} }, .. ]

    } else errorLog(result.error);
    
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
export const pullAccountsFromDMS = async containerName => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};
  const command = 'email list';
  let accounts = [];
  
  try {
    const targetDict = getTargetDict('mailserver', 'dms', containerName);

    debugLog(`execSetup(${command})`, targetDict);
    const results = await execSetup(command, targetDict);
    if (!results.returncode) {
    
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
      
    } else {
      let ErrorMsg = await formatDMSError('execSetup', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg };
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
export const addAccount = async (schema, containerName, mailbox, password, createLogin=1) => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};
  let result, results;

  try {
    const targetDict = getTargetDict('mailserver', schema, containerName);

    debugLog(`Adding new mailbox account for ${containerName}: ${mailbox}`);
    if (schema == 'dms') results = await execSetup(`email add ${mailbox} ${password}`, targetDict);

    if (!results.returncode) {
      
      const { salt, hash } = await hashPassword(password);
      result = dbRun(sql.accounts.insert.fromGUI, { mailbox:mailbox, domain:mailbox.split('@')[1], salt:salt, hash:hash, scope:containerName});
      if (result.success) {
        
        if (createLogin) {
          result = dbRun(sql.logins.insert.login, { email:mailbox, username:mailbox, salt:salt, hash:hash, isAdmin:0, isAccount:1, isActive:1, roles:JSON.stringify([mailbox]), scope:containerName});
          if (result.success) {
            successLog(`Account created: ${mailbox}`);
          } // login created
        
        } // also create login
        
      } // account created
      return result;
      
    } else {
      let ErrorMsg = await formatDMSError('addAccount', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg};
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


// Function to delete an mailbox account
export const deleteAccount = async (schema, containerName, mailbox) => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};

  let result, results;
  try {
    const targetDict = getTargetDict('mailserver', schema, containerName);

    // dms setup could take who know how long when mailbox is large
    targetDict.timeout = 60;
    if (schema == 'dms') results = await execSetup(`email del -y ${mailbox}`, targetDict);
    debugLog('ddebug execSetup',results)

    if (!results.returncode) {
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
      let ErrorMsg = await formatDMSError('execSetup', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg };
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

// doveadm function
// https://doc.dovecot.org/2.4.1/core/admin/doveadm.html
export const doveadm = async (schema, containerName, command, mailbox, jsonDict={}) => {   // jsonDict = {field:"messages unseen vsize", box:"INBOX Junk"}
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};
  debugLog(`for ${containerName}: ${command} ${mailbox}`, jsonDict);

  const doveadm = {
    index: {    // https://doc.dovecot.org/main/core/summaries/doveadm.html#index
      mailbox: true,
      cmd: 'doveadm index -u {mailbox} -q \\*',
      api: [["index", {"mailboxMask": "{box}", "allUsers": false, "user": "{mailbox}"}, "dms-gui"]],
      stdout: false,
      messages: {
        pass: 'Reindexing started for {mailbox}',
      },
    },
    indexerList: {    // https://doc.dovecot.org/main/core/summaries/doveadm.html#indexer%20list
      mailbox: true,
      cmd: 'doveadm index -u {mailbox} -q \\*',
      api: [["index", {"userMask": "{mailbox}"}, "dms-gui"]],
      stdout: true,
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
    mailboxStatus: {   // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20status
      mailbox: true,
      cmd: 'doveadm mailbox status -u {mailbox} {field} {box}',
    api: [["mailboxStatus", {"field": ["{field}"], "user": "{mailbox}", "mailboxMask": ["{box}"]}, "dms-gui"]],
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
    forceResync: {   // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20status
      mailbox: true,
      cmd: 'doveadm force-resync -u {mailbox} --mailbox-mask {box}',
      api: [["forceResync", {"allUsers": false, "user": "{mailbox}", "mailboxMask": "{box}"}, "dms-gui"]],
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
    const targetDict = getTargetDict('mailserver', schema, containerName);
    
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
    
    const results = await execCommand(formattedCommand, targetDict);
    if (!results.returncode) {
      
      successLog(formattedPass, results.stdout);
      return { success: true, message: results.stdout };
      
    } else {
      errorLog(results.stderr);
      return { success: false, error: results.sterr };
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


// unused
export const doveadmAPIforTesting = async (containerName, command, mailbox, jsonDict={}) => {

// https://doc.dovecot.org/main/core/admin/doveadm.html
// https://doc.dovecot.org/2.3/admin_manual/doveadm_http_api/
// https://doc.dovecot.org/main/core/admin/doveadm.html#example-session
// let doveadm_api_key = crypto.randomUUID();

// 99-api.conf
  // doveadm_password = doveadm_password
  // doveadm_api_key = "c9ed3894-7c23-4e71-be7e-bb23cff5d55e"

  // service doveadm {
     // unix_listener doveadm-server {
        // user = dovecot
     // }

    // inet_listener {
      // port = 2425
    // }

    // inet_listener http {
      // port = 8080
      // # For HTTPS, uncomment the line below:
      // # ssl = yes
    // }
  // }


// API_KEY=$(echo -n c9ed3894-7c23-4e71-be7e-bb23cff5d55e|base64)
// DOVEADM_PASS=$(echo -n doveadm:doveadm_password|base64)


// curl -H "Authorization: Basic $DOVEADM_PASS" http://localhost:8080/doveadm/v1
// curl -u doveadm:doveadm_password http://localhost:8080/doveadm/v1

// curl -H "Authorization: X-Dovecot-API $API_KEY" http://localhost:2425/
  // curl: (52) Empty reply from server

// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" http://localhost:8080/doveadm/v1
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["reload",{},"dms-gui"]]' http://localhost:8080/doveadm/v1 
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["mailboxStatus", {"field": ["messages"], "mailboxMask": ["INBOX"], "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[{"mailbox":"INBOX","messages":"24"}],"c01"]]
  
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["mailboxStatus", {"field": ["all"], "mailboxMask": ["INBOX"], "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[{"mailbox":"INBOX","messages":"24","recent":"24","uidnext":"25","uidvalidity":"1759246897","unseen":"24","highestmodseq":"3","vsize":"752111","guid":"6076763531fadb68571400008e1fe135","firstsaved":"1759246897"}],"dms-gui"]]

// https://doc.dovecot.org/main/core/summaries/doveadm.html#indexer%20list  // not in 2.3
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["indexerList", {"userMask": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["error",{"type":"unknownMethod", "returncode":0},"dms-gui"]]


// https://doc.dovecot.org/main/core/summaries/doveadm.html#force%20resync
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["forceResync", {"allUsers": false, "mailboxMask": "INBOX*", "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[],"dms-gui"]]


// https://doc.dovecot.org/main/core/summaries/doveadm.html#acl%20get       // not in 2.3
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["aclGet", {"allUsers": false, "mailbox": "INBOX", "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["error",{"type":"unknownMethod", "returncode":0},"dms-gui"]]

// https://doc.dovecot.org/main/core/summaries/doveadm.html#auth%20test     // not in 2.3
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["authTest", {"user": "diane@domain.com", "password": "password"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["error",{"type":"unknownMethod", "returncode":0},"dms-gui"]]
// doveadm auth test diane@domain.com "password"
  // passdb: diane@domain.com auth failed
// doveadm auth test diane@domain.com "M....!"
  // passdb: diane@domain.com auth succeeded

// https://doc.dovecot.org/main/core/summaries/doveadm.html#who
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["who", {"mask": "chloe@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[{"username":"chloe@domain.com","connections":"2","service":"imap","pids":"(13846 13842)","ips":"(63.225.200.129)"}],"dms-gui"]]
// https://doc.dovecot.org/2.3/admin_manual/doveadm_http_api/#doveadm-who
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["who", {"mask": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[],"dms-gui"]]
  
// test DMS API:
// curl -H "Authorization: dms-d6657c97-2f43-40c6-8104-3e3d43478f41" -H "Content-Type: application/json" -d '{"command":"ls -l"}' http://dms:8888
  

// https://doc.dovecot.org/main/core/admin/doveadm.html#example-session
// Requests that fail before the doveadm command is run returns 400/500 HTTP response codes:
  // Code	Reason
  // 400	Invalid request. Response body contains error message in text/plain.
  // 401	Unauthorized (missing authentication).
  // 403	Forbidden (authentication failed).
  // 404	Unknown doveadm command.
  // 500	Internal server error (see Dovecot logs for more information).

};



// module.exports = {
//   getAccounts,
//   addAccount,
//   deleteAccount,
//   doveadm,
// };


