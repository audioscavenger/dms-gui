import {
  getAllValuesByKey,
  isNonEmptyDict,
  reduxSets,
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
  env
} from './env.mjs';

import {
  dbAll,
  dbGet,
  dbRun,
  deleteEntry,
  hashPassword,
  sql,
  verifyPassword
} from './db.mjs';

// Global high-speed in-memory cache for locked out users, avoids spamming the database each time during a lockout
// since users can login with username or mailbox, we need 2 keys for each
// Key: username (string), Value: lockout_until (timestamp integer)
// Key: mailbox (string), Value: lockout_until (timestamp integer)
const lockoutCache = new Map();

// mailserver used to be containerName, now we want configID
// addLogin will not create a mailbox by itself, while addAccount will create a login for it
export const addLogin = async (mailbox, username, password='', email='', isAdmin=0, isAccount=0, isActive=1, mailserver=null, roles=[]) => {
  debugLog(mailbox, username, '********', email, isAdmin, isActive, isAccount, mailserver, roles);

  let result;
  try {
    // even when password is undefined, we can get a hash value
    const { salt, hash } = await hashPassword(password ?? '');
    // login:    `REPLACE INTO logins  (mailbox, username, email, salt, hash, isAdmin, isAccount, isActive, mailserver, roles) VALUES (@mailbox, @username, @email, @salt, @hash, @isAdmin, @isAccount, @isActive, @mailserver, @roles)`,
    // result = dbRun(sql.logins.insert.login, { mailbox:mailbox, username:username, email:email, salt:salt, hash:hash, isAdmin:isAdmin, isAccount:isAccount, isActive:isActive, mailserver:mailserver, roles:JSON.stringify(roles) });
    
    // since 1.5.67 we have the roles table
    result = dbRun(sql.logins.insert.login, { mailbox:mailbox, username:username, email:email, salt:salt, hash:hash, isAdmin:isAdmin, isAccount:isAccount, isActive:isActive, mailserver:mailserver });
    if (result.success) {
      successLog(`Saved login ${username}:${mailbox} with id=${result.message.id}`);

      // add role for that mailbox to that login
      // sql.logins.insert.login has RETURNING, therefore, dbRun will call dbGet and return message = {id:value}
      result = dbRun(sql.roles.insert.role, {loginID:result.message.id}, ...roles);
      if (result.success) successLog(`Saved roles for ${username}:${mailbox}: ${roles}`);
      
    }
    return result;

  } catch (error) {
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// this returns an objects
// credential can be:
//  string: mailbox or username
//  number: id
//  object: {key: value} with key=any column in that table
export const getLogin = async (credential, withSalts=false) => {
  
  let login = {success:false, error: 'invalid credential: neither number/username/email/object'};
  try {
    
    // we expect either an object like {id:id}|{mailbox:mailbox}|{username:username}
    if (Number.isInteger(parseInt(credential))) {
      login = dbGet(sql.logins.select[withSalts ? 'loginByIdSalted' : 'loginById'], {[sql.logins.key]: credential});

    } else if (typeof credential == "string" && (regexEmailStrict.test(credential) || regexUsername.test(credential))) {
      login = dbGet(sql.logins.select[withSalts ? 'loginSalted' : 'login'], {mailbox: credential, username: credential});

    } else if (isNonEmptyDict(credential) == 1) {
      login = dbGet(sql.logins.select[withSalts ? 'loginByObjSalted' : 'loginByObj'].replace("{key}", Object.keys(credential)[0]), credential);
    }
    if (login.success) {
      
      if (isNonEmptyDict(login.message)) {
        // infoLog(`Found login ${credential}:`, {isAdmin:login.message.isAdmin, isActive:login.message.isActive, isAccount:login.message.isAccount, roles:login.message.roles});
        // JSON.parse(roles) as it's stored stringified in the db
        // login.message.roles = (login.message?.roles) ? cleanRoles(JSON.parse(login.message.roles)) : [];

        // since 1.5.67 roles are in table roles and there cannot be duplicates
        // Parses '[null]' to [null], then .filter(Boolean) converts it to []
        login.message.roles = JSON.parse(login.message.roles).filter(Boolean);

      } else login.success = false;
      
    }
    return login;
    
  } catch (error) {
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// loginHandler handles a counter and lockout times, verifies password against local db or dms/doveadm
export const loginHandler = async (password, login, test) => {
  const now = Date.now();

  // Perform the actual password verification
  let result;
  if (login.isAccount) {
    // TODO: get a way to have schema=dms as a global variable somewhere?
    result = await doveadm('dms', login.mailserver, 'loginUser', login.mailbox, {mailbox: login.mailbox, password: password});
    if (!result?.returncode) result.success = true;

  } else {
    result = await verifyPassword(password, login);
  }

  debugLog('ddebug', test, login.username, password)
  if (result.success) {
    // Clear the counter on a successful login
    result = dbRun(sql.logins.update.resetAttempts, {attempts: 0, lockout_until: 0}, login.id);
    lockoutCache.delete(login.username);
    lockoutCache.delete(login.mailbox);

  // do not increment failures for the test login when it's the test; you can spam refresh but actual login is never returned anyways
  } else if (!test) {
    // Increment failures and exponentially scale the lockout time
    const currentAttempts = login.attempts +1;
    
    let lockout_until = 0;
    // Exponential backoff: square the time window for every failed attempt
    const penaltyMultiplier = Math.pow(2, currentAttempts);
    lockout_until = now + (env.BASE_LOCKOUT_TIME * penaltyMultiplier);

    lockoutCache.set(login.username, lockout_until);
    lockoutCache.set(login.mailbox, lockout_until);
    result = dbRun(sql.logins.update.resetAttempts, {attempts: currentAttempts, lockout_until: lockout_until}, login.id);
    if (result.success) result.success = false;
  }

  return result;
};


// loginUser will not throw an error an attacker can potentially exploit, neither will the index throw a 401 or 403
export const loginUser = async (credential=null, password='', test=false) => {
  const now = Date.now();

  let login = {success: false};
  let result, results, message;
  let lockoutCacheFound = false;
  try {

    // debugLog('ddebug lockoutCache', lockoutCache);
    if (lockoutCache.has(credential)) {
      const memoryLockoutUntil = lockoutCache.get(credential);
      if (memoryLockoutUntil > now) {
        const secondsLeft = Math.ceil((memoryLockoutUntil - now) / 1000);
        message = `Too many failed attempts. Try again in ${secondsLeft} seconds.`;
        warnLog(message);
        login.message = message;
        login.success = false;
        lockoutCacheFound = true;

      }

    }

    if (!lockoutCacheFound) {
      // login not in lockoutCache or memoryLockoutUntil expired
      login = await getLogin(credential, true); // request a login loaded with salt, hash, attempts and lockout_until
      // debugLog('ddebug 1 getLogin login', login);
      if (login.success) {
        if (login.message.lockout_until <= now) {
          if (login.message.isActive) {
            if (login.message.isAccount) {
              if (login.message.mailserver) {
                if (login.message.mailbox) {

                  result = await loginHandler(password, login.message);
                  // debugLog('ddebug mailbox loginHandler result', result)
                  if (result.success) {
                    successLog(`User ${credential} logged in successfully`);
                    
                  } else {
                    message = result?.error || `User ${credential} password is invalid`;
                    warnLog(message);
                    login.message = message;
                    login.success = false;
                    login.returncode = results?.returncode;   // index doesn't do anything with that yet
                  }

                } else {
                  message = `${credential} does not have a mailbox`;
                  errorLog(message);
                  login.message = message;
                  login.success = false;
                }

              } else {
                message = `${credential} does not have a mailserver assigned yet`;
                errorLog(message);
                login.message = message;
                login.success = false;
              }
              
            } else {
              // result = await verifyPassword(password, login.message);
              result = await loginHandler(password, login.message, test);
              // debugLog('ddebug 2 getLogin result', result);
              if (result.success) {
                successLog(`User ${credential} logged in successfully`);
                
              } else {
                message = (test && login.message.username == 'admin' && password == 'changeme') ? `Login page refresh with ${credential}/${password}` : result?.error || `User ${credential} password invalid`;
                warnLog(message);
                login.message = message;
                login.success = false;
                // debugLog('ddebug 2 getLogin login', login);
              }
            }
          } else {
            message = `User ${credential} is inactive`;
            errorLog(message);
            login.message = message;
            login.success = false;
          }
        } else {
          // with lockoutCache we should never reach this branch
          lockoutCache.set(login.message.username, login.message.lockout_until);
          lockoutCache.set(login.message.mailbox, login.message.lockout_until);
          const secondsLeft = Math.ceil((login.message.lockout_until - now) / 1000);
          message = `Too many failed attempts. Try again in ${secondsLeft} seconds.`;
          warnLog(message);
          login.message = message;
          login.success = false;
        }
      } else {
        message = `${credential} does not exist`;
        errorLog(message);
        login.message = message;
        login.success = false;
      }
    }

    // remove sensitive data
    if (login.success) {
      const {salt, hash, attempts, lockout_until, ... cleanLogin} = login.message;
      login.message = cleanLogin;
    }
    // debugLog('ddebug 4 getLogin login', login);
    return login;
    
  } catch (error) {
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // throw new Error(backendError);
    
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
      id = parseInt(id);
      
      // deleteLogin takes an id and nothing else
      login = await getLogin(id);
      if (login.success) {
        
        // login exist and it's the right one: someone may have named their username "13" with id=15 for instance
        if (login.message?.id == id) {
          
          // delete the login
          result = await deleteEntry('logins', id);
          if (result.success) {

            // login deleted, delete the roles
            result = deleteEntry('roles', id);
            if (result.success) {
            
              // login and roles deleted, delete the mailbox
              if (alsoDeleteMailbox) {

                // no result check for deleting a mailbox, return as is
                result = await deleteAccount(schema, login.message.mailserver, login.message.mailbox);
              }

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
    errorLog(error.message || error);
    throw new Error(error.message || error);
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
    
    // specific credentials: map getLogin for each
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
        // now remove all undefined entries // TODO: not sure we need that
        logins = logins.filter(element => element !== null);
      }
      
    // no credentials: return all logins
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
          debugLog('logins have those mailboxes:', mailboxes)
        }

        // don't forget to JSON.parse roles as it's stored stringified in the db
        // logins = result.message.map(login => { return { ...login, roles: cleanRoles(JSON.parse(login.roles), mailboxes) }; });
        // since 1.5.67 we need to clean roles differently and roles are definitely uniq, guaranteed
        logins = result.message.map(login => { return { ...login, roles: JSON.parse(login.roles).filter(Boolean) }; });
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
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// cleaning up string-encoded array of roles in the db off missing mailboxes is not fun, let's do it here
export const cleanRoles = (roles=[], validMailboxes=[], set=false) => {
  if (!Array.isArray(roles)) roles = new Set(roles);
  if (!Array.isArray(validMailboxes)) validMailboxes = new Set(validMailboxes);

  if (validMailboxes.size == 0) {
    // get all uniq and existing mailboxes in one go if not passed
    // TODO: can we limit by name=containerName/mailserver?
    let result = dbAll(sql.accounts.select.mailboxes, {name:'%'});
      // [
      //   { mailbox: "admin@aaa.com" },
      //   { mailbox: "chloe@bbb.com" },
      // ]
    if (result.success) {
      validMailboxes = new Set(getAllValuesByKey(result.message, 'mailbox', true));
    }
  }

  // debugLog('ddebug roles=',roles, 'validMailboxes=', validMailboxes);
  const uniqRoles = reduxSets(roles, validMailboxes)
  return (set) ? uniqRoles : [...uniqRoles];

};


// this returns an array // cancelled
// credential can be:
//  string: mailbox or username
//  number: id
//  object: {key: value} with key=any column in that table
export const getRolesFromConfigs = async (credential=null) => {

  let roles = {success:false, error: 'invalid credential: neither email/object'};
  try {
    
    // we expect either an object {id:id} or {id:id}|{mailbox:mailbox}|{username:username}
    // or a string: mailbox == what's in the id keay of that table
    // we expect either an object like {id:id}|{mailbox:mailbox}|{username:username}
    if (Number.isInteger(parseInt(credential))) {
      result = dbGet(sql.logins.select.rolesById, {[sql.logins.key]: credential});

    } else if (typeof credential == "string" && regexEmailStrict.test(credential)) {
      roles = dbGet(sql.logins.select.roles, {mailbox: credential, username: credential});

    } else if (isNonEmptyDict(credential) == 1) {
      roles = dbGet(sql.logins.select.rolesByObj.replace("{key}", Object.keys(credential)[0]), credential);
    }
    if (roles?.success) {
      // roles is now a classic array of objects like [{value:mailbox}, ..]
      let rolesSet = plucks(roles.message);
      let cleanedRolesSet = cleanRoles(rolesSet, false);  // TODO: once we trust that roles are maintained properly in settings table, we can avoid that line
      return {success: true, message: cleanedRolesSet};
      
    }
    return roles;
    
  } catch (error) {
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// this returns an array // unused since 1.5.67
// credential can be:
//  string: mailbox or username
//  number: id
//  object: {key: value} with key=any column in that table
export const getRolesFromLogins = async (credential=null) => {

  let roles = {success:false, error: 'invalid credential: neither email/object'};
  try {
    
    // we expect either an object {id:id} or {id:id}|{mailbox:mailbox}|{username:username}
    // or a string: mailbox == what's in the id keay of that table
    // we expect either an object like {id:id}|{mailbox:mailbox}|{username:username}
    if (Number.isInteger(parseInt(credential))) {
      result = dbGet(sql.logins.select.rolesById, {[sql.logins.key]: credential});

    } else if (typeof credential == "string" && regexEmailStrict.test(credential)) {
      roles = dbGet(sql.logins.select.roles, {mailbox: credential, username: credential});

    } else if (isNonEmptyDict(credential) == 1) {
      roles = dbGet(sql.logins.select.rolesByObj.replace("{key}", Object.keys(credential)[0]), credential);
    }
    if (roles?.success) {
      // cleaning up string-encoded array of roles in the db off missing mailboxes is not fun, let's do it here
      let cleanedRoles = cleanRoles(JSON.parse(roles.message), false);
      return {success: true, message: cleanedRoles};
      
    }
    return roles;
    
  } catch (error) {
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// this returns an array of objects from the roles table
// still unused
export const getRoles = async (credential) => {
  
  let roles = {success:false, error: 'invalid credential: neither number/username/email/object'};
  try {
    
    // we expect either an object like {id:id}|{mailbox:mailbox}|{username:username}
    if (Number.isInteger(parseInt(credential))) {
      roles = dbGet(sql.roles.select.rolesById, {[sql.roles.key]: credential});

    } else if (typeof credential == "string" && (regexEmailStrict.test(credential) || regexUsername.test(credential))) {
      roles = dbGet(sql.roles.select.roles, {mailbox: credential, username: credential});

    } else if (isNonEmptyDict(credential) == 1) {
      roles = dbGet(sql.roles.select.rolesByObj.replace("{key}", Object.keys(credential)[0]), credential);
    }
    if (roles.success) {
      
      if (isNonEmptyDict(roles.message)) {
        
        // Parses '[null]' to [null], then .filter(Boolean) converts it to []
        roles.message = JSON.parse(roles.message).filter(Boolean);

      } else roles.success = false;
      
    }
    return roles;
    
  } catch (error) {
    errorLog(error.message || error);
    throw new Error(error.message || error);
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


