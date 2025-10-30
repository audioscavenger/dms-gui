require('./env.js');
const {
  docker,
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  byteSize2HumanSize,
  jsonFixTrailingCommas,
  formatDMSError,
  reduxPropertiesOfObj,
  execSetup,
  execCommand,
  readJson,
  writeJson,
} = require('./backend');

const {
  sql,
  dbRun,
  dbAll,
  dbGet,
  hashPassword,
  verifyPassword,
} = require('./db');

const fs = require("fs");
const fsp = fs.promises;


// this returns an array
async function getRoles(email, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    
    const roles = await dbGet(sql.logins.select.roles, containerName, email);
    return JSON.parse(roles);
    
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


// this returns an objects
async function getLogin(credential) {
  try {
    
    let login = await dbGet(sql.logins.select.login, credential, credential);
    // now JSON.parse roles as it's stored stringified in the db
    login.roles = JSON.parse(login.roles);
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
}


// this returns an array of objects
async function getLogins(credential) {
  if (credential) return getLogin(credential);

  let logins = [];
  try {
    
    logins = await dbAll(sql.logins.select.logins);
    debugLog(`pulled ${logins.length} logins`);
    
    // we could read DB_Logins and it is valid
    if (logins.length) {
      infoLog(`Found ${logins.length} entries in logins`);
      
      // now JSON.parse roles as it's stored stringified in the db
      logins = logins.map(login => { return { ...login, roles: JSON.parse(login.roles) }; });
      
    } else {
      warnLog(`logins in db seems empty:`, logins);
    }
    
    return logins;
    // [ {email: email, username: username, isActive:1, ..}, ..]
    
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
}


async function addLogin(email, username, password, isAdmin=0, isActive=1, isAccount=0, roles=[]) {

  try {
    debugLog(email, username, password, email, isAdmin, isActive, isAccount, roles);
    
    const { salt, hash } = await hashPassword(password);
    dbRun(sql.logins.insert.login, { email:email, username:username, salt:salt, hash:hash, isAdmin:isAdmin, isActive:isActive, isAccount:isAccount, roles:JSON.stringify(roles) });
    successLog(`Saved login ${username}:${email}`);
    return { success: true };

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
}


async function deleteLogin(email) {

  try {
    const activeAdmins = await dbAll(sql.logins.select.isActive.admins);
    const login =  await getLogin(email);
    debugLog(`pulled login:`, login);
    debugLog(`pulled ${activeAdmins.length} admins`, activeAdmins);
    
    // if login exist...
    if (login) {
      
      // don't delete the last admin
      if (activeAdmins.length > 1) {
        dbRun(sql.logins.delete.login, email);
        successLog(`Login deleted: ${email}`);
        
      } else errorLog("Cannot delete the last login, how will you log back in?");
      
    } else errorLog(`Login ${email} does not exist`);
    
  } catch (error) {
    let backendError = 'Error deleting login';
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


// loginUser will not throw an error an attacker can exploit
async function loginUser(credential, password) {
  
  try {
    const login = dbGet(sql.logins.select.isActive.login, credential, credential);

    if (login.isActive) {
      const isValid = await verifyPassword(credential, password, 'logins');
      
      if (isValid) {
        successLog(`User ${credential} logged in successfully.`);
        return login;
        
      } else {
        warnLog(`User ${credential} invalid password.`);
        return false;
      }
    } else {
      warnLog(`User ${credential} is inactive.`);
      return false;
    }
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
}


// this returns an array of objects // cancelled
async function getRolesFromRoles(containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  debugLog(`start`);
  try {
    
    const roles = await dbAll(sql.roles.select.roles, containerName);
    debugLog(`pulled ${roles.length} roles`);
    
    // we could read DB_Logins and it is valid
    if (roles.length) {
      infoLog(`Found ${roles.length} entries in roles`);
      
    } else {
      warnLog(`roles in db seems empty:`, roles);
    }
    
    return roles;
    // [ { username: username, email: email }, ..]
    
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
}


module.exports = {
  getLogin,
  getLogins,
  addLogin,
  deleteLogin,
  loginUser,
  getRoles,
};


