import {
  debugLog,
  errorLog,
  infoLog,
  successLog,
  warnLog,
} from './backend.js';
import {
  live
} from './env.js';

import {
  dbAll,
  dbGet,
  dbRun,
  hashPassword,
  sql,
  verifyPassword,
} from './db.js';


// this returns an array
export const getRoles = async credential => {

  try {
    
    let roles = await dbGet(sql.logins.select.roles, {email: credential, username: credential});
    if (roles.success) {
      return {success: true, message: JSON.parse(roles.message)};
      
    }
    return roles;
    
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
};


// this returns an objects
export const getLogin = async credential => {
  try {
    
    let login = await dbGet(sql.logins.select.login, {email: credential, username: credential});
    if (login.success) {
      
      if (Object.keys(login.message).length) {
        infoLog(`Found login=`, login.message);

        // now JSON.parse roles as it's stored stringified in the db
        login.message.roles = (login.message?.roles) ? JSON.parse(login.message.roles) : [];
      } else login.success = false;
      
    }
    return login;
    
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
};


// this returns an array of objects, credentials is either email or username, or array of those
export const getLogins = async credentials => {
  if (typeof credentials == "string") return getLogin(credentials);

  let logins = [];
  try {
    
    debugLog(`credentials=`, credentials);
    if (Array.isArray(credentials) && credentials.length) {
      // roles come already parsed from getLogin
      let logins = await Promise.all(credentials.map(credential => { return getLogin(credential); }));
      if (logins.success) {
        infoLog(`Found ${logins.message.length} entries in logins for`, credentials);
        
        // now remove all undefined entries
        logins.message = logins.message.filter(element => element !== undefined);
      }
      
    } else {
      let logins = await dbAll(sql.logins.select.logins);
      if (logins.success) {
        // now JSON.parse roles as it's stored stringified in the db
        logins.message = logins.message.map(login => { return { ...login, roles: JSON.parse(login.message.roles) }; });
        infoLog(`Found ${logins.message.length} entries in logins`);
      }
    }
    
    // we could read DB_Logins and it is valid
    if (!logins.message.length) warnLog(`db logins seems empty:`, logins);
    
    return logins;
    // {success: true, message: [ {email: email, username: username, isActive:1, ..}, ..] }
    
  } catch (error) {
    let backendError = error.message;
    errorLog(backendError);
    throw new Error(backendError);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


export const addLogin = async (email, username, password, isAdmin=0, isAccount=0, isActive=1, roles=[]) => {

  try {
    debugLog(email, username, password, email, isAdmin, isActive, isAccount, roles);
    
    const { salt, hash } = await hashPassword(password);
    const result = dbRun(sql.logins.insert.login, { email:email, username:username, salt:salt, hash:hash, isAdmin:isAdmin, isAccount:isAccount, isActive:isActive, roles:JSON.stringify(roles) });
    if (result.success) {
      successLog(`Saved login ${username}:${email}`);
      
    }
    return result;

  } catch (error) {
    let backendError = `${error.message}`;
    errorLog(`${backendError}`);
    throw new Error(backendError);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// loginUser will not throw an error an attacker can exploit
export const loginUser = async (credential, password) => {
  
  try {
    let login = await getLogin(credential);

    if (login.success) {
      if (login.message.isActive) {
        const isValid = await verifyPassword(credential, password, 'logins');
        
        if (isValid) {
          successLog(`User ${credential} logged in successfully.`);
          
        } else {
          warnLog(`User ${credential} invalid password.`);
          login.success = false;
        }
      } else {
        warnLog(`User ${credential} is inactive.`);
        login.success = false;
      }
    } else {
      warnLog(`User ${credential} not found.`);
    }
    return login;
    
  } catch (error) {
    let backendError = error.message;
    errorLog(`${backendError}`);
    return false;
    // throw new Error(backendError);
    
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// this returns an array of objects // cancelled
export const getRolesFromRoles = async containerName => {
  containerName = (containerName) ? containerName : live.DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  debugLog(`start`);
  try {
    
    let roles = await dbAll(sql.roles.select.roles, {scope:containerName});
    if (roles.success) {
      debugLog(`pulled ${roles.message.length} roles`);
      
      // we could read DB_Logins and it is valid
      if (roles.message.length) {
        infoLog(`Found ${roles.message.length} entries in roles`);
        
      } else {
        warnLog(`db roles seems empty:`, roles);
      }
    }
    return roles;
    // {success: true, message: [ { username: username, email: email }, ..] }
    
  } catch (error) {
    let backendError = error.message;
    errorLog(backendError);
    throw new Error(backendError);
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


