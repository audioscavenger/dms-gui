import {
  getAllValuesByKey,
  keepMatchingStrings,
  regexEmailStrict,
  regexUsername
} from '../common.mjs';
import {
  deleteAccount,
} from './accounts.mjs';
import {
  debugLog,
  doveadm,
  errorLog,
  infoLog,
  successLog,
  warnLog
} from './backend.mjs';

import {
  dbAll,
  dbGet,
  dbRun,
  deleteEntry,
  hashPassword,
  sql,
  verifyPassword
} from './db.mjs';


// this returns an objects
// credential can be:
//  string: mailbox or username
//  number: id
//  object: {key: value} with key=any column in that table
export const getLogin = async (credential) => {
  
  let result = {success:false, error: 'invalid credential: neither number/username/email/object'};
  try {
    
    // we expect either an object like {id:id}|{mailbox:mailbox}|{username:username}
    if (Number.isInteger(parseInt(credential))) {
      result = dbGet(sql.logins.select.loginById, {[sql.logins.key]: credential});

    } else if (typeof credential == "string" && (regexEmailStrict.test(credential) || regexUsername.test(credential))) {
      result = dbGet(sql.logins.select.login, {mailbox: credential, username: credential});

    } else if (typeof credential == "object" && Object.keys(credential).length == 1) {
      result = dbGet(sql.logins.select.loginByObj.replace("{key}", Object.keys(credential)[0]), credential);
    }
    if (result.success) {
      
      if (result.message && Object.keys(result.message).length) {
        infoLog(`Found login ${credential}:`, {isAdmin:result.message.isAdmin, isActive:result.message.isActive, isAccount:result.message.isAccount, roles:result.message.roles});

        // now JSON.parse roles as it's stored stringified in the db
        result.message.roles = (result.message?.roles) ? cleanRoles(JSON.parse(result.message.roles)) : [];
      } else result.success = false;
      
    }
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


// deleteLogin takes an id and nothing else atm
export const deleteLogin = async (id, alsoDeleteMailbox=false, schema='dms') => {
  debugLog(id, alsoDeleteMailbox, schema);
  let login, result;

  try {
    
    // it's an id and we test it's an actual number: this is the only true test for numbers
    if (Number.isInteger(parseInt(id))) {
      
      // deleteLogin takes an id and nothing else
      login = await getLogin(parseInt(id));
      if (login.success) {
        
        // login exist and it's the right one: someone may have named their username "13" with id=15 for instance
        if (login.message?.id == id) {
          
          // delete the login
          result = await deleteEntry('logins', parseInt(id), 'id');
          if (result.success) {

            // login deleted, delete the mailbox
            if (alsoDeleteMailbox) {

              // no result check for deleting a mailbox, return as is
              result = await deleteAccount(schema, login.message.mailserver, login.message.mailbox);
            }

          } // dbRun failed, return the result as is

        } else result = {success:false, error:`Login id=${id} does not exist`};

      } // dbGet failed, return the result as is

    } else {
      errorLog('deleteLogin takes an id, arguments passed:', JSON.stringify(id, alsoDeleteMailbox));
      result = {success: false, error: 'deleteLogin takes an id'};
    };

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


// this returns an array of objects, credentials is either mailbox or username, or array of those, or an object like {id:id}|{mailbox:mailbox}|{username:username}, or array of those
// credentials = [mailbox1, mailbox2, username3, id4, object5, ..]
// credentials = mailbox1 | username | id | object
// credentials = null -> returns all logins
export const getLogins = async (credentials=null) => {
  debugLog(credentials);
  
  // credentials = mailbox | username | id | object
  if (credentials && !Array.isArray(credentials)) return getLogin(credentials);

  // credentials is an array of mailbox1 | username | id | object
  let result, logins, accounts, mailboxes;
  try {
    
    debugLog(`credentials=`, credentials);
    if (Array.isArray(credentials) && credentials.length) {
      
      // roles come already parsed from getLogin
      logins = await Promise.all(
        credentials.map(async (credential) => {
          const login = await getLogin(credential);
          if (login.success) return login?.message || null;
        })
      );
      infoLog(`Found ${logins.length} entries in logins for`, credentials);

      if (logins.length) {
        // now remove all undefined entries
        logins = logins.filter(element => element !== null);
      }
      
    // return all logins: credentials is null or empty array
    } else {
      result = dbAll(sql.logins.select.logins);
      if (result.success) {

        // get all uniq and existing mailboxes here and pass it to cleanRoles otherwise it's gonna query the db for each login
        // TODO: can we limit by name=containerName/mailserver?
        accounts = dbAll(sql.accounts.select.mailboxes, {name:'%'});
          // [
          //   { mailbox: "admin@aaa.com" },
          //   { mailbox: "chloe@bbb.com" },
          // ]
        if (accounts.success) {
          mailboxes = getAllValuesByKey(accounts.message, 'mailbox', true);
          debugLog('mailboxes =', mailboxes)
        }

        // don't forget to JSON.parse roles as it's stored stringified in the db
        logins = result.message.map(login => { return { ...login, roles: cleanRoles(JSON.parse(login.roles), mailboxes) }; });
        // debugLog('ddebug Found logins =', logins)
      }
    }
    
    // we could read DB_Logins and it is valid
    if (logins.length) {
      infoLog(`Found ${logins.length} entries in logins`);
    } else {
      warnLog(`logins table is empty`);
    }
    
    return {success: true, message: logins};
    // {success: true, message: [ {mailbox: mailbox, username: username, email: email, isActive:1, ..}, ..] }
    
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


// cleaning up string-encoded array of roles in the db off missing mailboxes is not fun, let's do it here
export const cleanRoles = (roles=[], validMailboxes=[]) => {
  if (!Array.isArray(roles)) roles = [roles];
  if (!Array.isArray(validMailboxes)) validMailboxes = [validMailboxes];

  if (validMailboxes.length == 0) {
    // get all uniq and existing mailboxes in one go if not passed
    // TODO: can we limit by name=containerName/mailserver?
    let result = dbAll(sql.accounts.select.mailboxes, {name:'%'});
      // [
      //   { mailbox: "admin@aaa.com" },
      //   { mailbox: "chloe@bbb.com" },
      // ]
    if (result.success) {
      validMailboxes = getAllValuesByKey(result.message, 'mailbox', true);
    }
  }

  // debugLog('ddebug roles=',roles, 'validMailboxes=', validMailboxes);
  return keepMatchingStrings(roles, validMailboxes);

};


// this returns an array
// credential can be:
//  string: mailbox or username
//  number: id
//  object: {key: value} with key=any column in that table
export const getRoles = async (credential=null) => {

  let roles = {success:false, error: 'invalid credential: neither email/object'};
  try {
    
    // we expect either an object {id:id} or {id:id}|{mailbox:mailbox}|{username:username}
    // or a string: mailbox == what's in the id keay of that table
    // we expect either an object like {id:id}|{mailbox:mailbox}|{username:username}
    if (Number.isInteger(parseInt(credential))) {
      result = dbGet(sql.logins.select.rolesById, {[sql.logins.key]: credential});

    } else if (typeof credential == "string" && regexEmailStrict.test(credential)) {
      roles = dbGet(sql.logins.select.roles, {mailbox: credential, username: credential});

    } else if (typeof credential == "object" && Object.keys(credential).length == 1) {
      roles = dbGet(sql.logins.select.rolesByObj.replace("{key}", Object.keys(credential)[0]), credential);
    }
    if (roles?.success) {
      // cleaning up string-encoded array of roles in the db off missing mailboxes is not fun, let's do it here
      let cleanedRoles = cleanRoles(JSON.parse(roles.message));
      return {success: true, message: cleanedRoles};
      
    }
    return roles;
    
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


// mailserver used to be containerName, now we want configID
// addLogin will not create a mailbox by itself, while addAccount will create a login for it
export const addLogin = async (mailbox, username, password='', email='', isAdmin=0, isAccount=0, isActive=1, mailserver=null, roles=[]) => {
  debugLog(mailbox, username, '********', email, isAdmin, isActive, isAccount, mailserver, roles);

  try {
    // even when password is undefined, we can get a hash value
    const { salt, hash } = await hashPassword(password ?? '');
    // login:    `REPLACE INTO logins  (mailbox, username, email, salt, hash, isAdmin, isAccount, isActive, mailserver, roles) VALUES (@mailbox, @username, @email, @salt, @hash, @isAdmin, @isAccount, @isActive, @mailserver, @roles)`,
    const result = dbRun(sql.logins.insert.login, { mailbox:mailbox, username:username, email:email, salt:salt, hash:hash, isAdmin:isAdmin, isAccount:isAccount, isActive:isActive, mailserver:mailserver, roles:JSON.stringify(roles) });
    if (result.success) {
      successLog(`Saved login ${username}:${mailbox}`);
      
    }
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


// loginUser will not throw an error an attacker can potentially exploit, neither will the index throw a 401 or 403
export const loginUser = async (credential=null, password='') => {
  
  let login, isValid, results, message;
  try {
    login = await getLogin(credential);

    if (login?.success) {
      if (login.message.isActive) {
        if (login.message.isAccount) {
          if (login.message.mailserver) {
            if (login.message.mailbox) {
              // const targetDict = getTargetDict('mailserver', login.message.mailserver);
              // targetDict.timeout = 5;
              // let command = `doveadm auth test ${login.message.mailbox} '${password}'`;
              // results = await execCommand(command, targetDict);

              // doveadm(schema='dms', containerName=null, command=null, mailbox=null, jsonDict={})   // jsonDict = {mailbox:"mail@x.y", password:"password"}
              // TODO: transfer the schema dms/Poste etc somehow or get a way to retrieve it; we are fare far way for that anyways
              results = await doveadm('dms', login.message.mailserver, 'loginUser', login.message.mailbox, {mailbox: login.message.mailbox, password: password});

              if (!results?.returncode) {
                successLog(`${credential} logged in successfully`);
                
              } else {
                message = `${credential} password invalid`;
                warnLog(message);
                login.message = message;
                login.success = false;
                login.returncode = results?.returncode;
              }

            } else {
              message = `${credential} does not have a mailbox`;
              errorLog(message);
              login.success = false;
              login.message = message;
            }
          } else {
            message = `${credential} does not have a mailserver assigned yet`;
            errorLog(message);
            login.success = false;
            login.message = message;
          }
          
        } else {
          isValid = await verifyPassword(credential, password, 'logins');
          if (isValid) {
            successLog(`User ${credential} logged in successfully`);
            
          } else {
            message = `User ${credential} password invalid`;
            warnLog(message);
            login.message = message;
            login.success = false;
          }
        }
      } else {
        message = `User ${credential} is inactive`;
        warnLog(message);
        login.message = message;
        login.success = false;
      }
    } else {
      message = `${credential} does not exist`;
      warnLog(message);
      login.message = message;
    }

    return login;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // throw new Error(backendError);
    
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// this returns an array of objects // cancelled
export const getRolesFromRoles = async (containerName=null) => {
  if (!containerName) return {success: false, error: 'containerName is null'};

  try {
    
    let roles = dbAll(sql.roles.select.rolesByObj, {mailserver:containerName});
    if (roles?.success) {
      debugLog(`pulled ${roles.message.length} roles`);
      
      // we could read DB_Logins and it is valid
      if (roles.message.length) {
        infoLog(`Found ${roles.message.length} entries in roles`);
        
      } else {
        warnLog(`db roles seems empty:`, roles);
      }
    }
    return roles;
    // {success: true, message: [ { username: username, mailbox: mailbox }, ..] }
    
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


// module.exports = {
//   getLogin,
//   getLogins,
//   addLogin,
//   loginUser,
//   getRoles,
// };


