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


// this returns an array
async function getRoles(username, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    
    const roles = await dbGet(sql.logins.select.roles, containerName, username);
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
async function getLogin(username) {
  try {
    
    let login = await dbGet(sql.logins.select.login, username);
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
async function getLogins(username) {
  if (username) return getLogin(username);

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


async function addLogin(username, password, email='', isAdmin=0, isActive=1, roles=[]) {
  console.debug('ddebug password, email',password, email)
  try {
    debugLog(username, password, email, isAdmin);
    
    const { salt, hash } = await hashPassword(password);
    dbRun(sql.logins.insert.login, { username:username, salt:salt, hash:hash, email:email, isAdmin:isAdmin, isActive:isActive, roles:JSON.stringify(roles) });
    successLog(`Saved login ${username}`);
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


async function changePasswordLogin(username, password) {

  try {
    debugLog(`Updating password for login: ${username}`);
    
    const { salt, hash } = await hashPassword(password);
    dbRun(sql.logins.update.password, { username:username, salt:salt, hash:hash });
    successLog(`Password updated for login: ${username}`);
    return { success: true };
    
  } catch (error) {
    let backendError = 'Error updating login password';
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


async function updateLogin(username, jsonDict) {
  // jsonArrayOfObjects = {email:email, isAdmin:isAdmin, isActive:isActive }
  
  try {
    if (Object.keys(jsonDict).length = 0) {
      throw new Error('nothing to modify was passed');
    }
    
    debugLog(`Updating login ${username} with jsonDict:`, jsonDict);
    let validDict = reduxPropertiesOfObj(jsonDict, Object.keys(updateValidKeys.logins));
    if (Object.keys(validDict).length = 0) {
      throw new Error('nothing valid was passed');
    }
    
    debugLog(`Updating login ${username} with validDict:`, validDict);    // { isAdmin: true }
    for (const [key, value] of Object.entries(validDict)) {
      if (key == 'password') {
        return changePasswordLogin(username, value);
        
      } else if (key == 'roles') {
        dbRun(sql.logins.update[key], {[key]:JSON.stringify(value)}, username);
        debugLog(`Updated login ${username} with ${key}=${value}`);
        return { success: true };
        
      } else {
        dbRun(sql.logins.update[key], {[key]:value}, username);
        debugLog(`Updated login ${username} with ${key}=${value}`);
        return { success: true };
      }
    }
    
  } catch (error) {
    let backendError = 'Error updating login';
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


async function deleteLogin(username) {

  try {
    const activeAdmins = await dbAll(sql.logins.select.isActive.admins);
    const login =  getLogin(username);
    debugLog(`pulled login:`,login);
    debugLog(`pulled ${activeAdmins.length} admins`, activeAdmins);

    if (!login?.username) {
      // don;t delete the last admin
      if (activeAdmins.length && activeAdmins[0].username != username) {
        dbRun(sql.logins.delete.login, username);
        successLog(`Login deleted: ${username}`);
        
      } else errorLog("Cannot delete the last login, how will you log back in?");
      
    } else errorLog(`Login ${username} does not exist`);
    
  } catch (error) {
    let backendError = 'Error deleting login';
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


// loginUser will not throw an error an attacker can exploit
async function loginUser(username, password) {
  
  try {
    const isActive = await dbGet(sql.logins.select.isActive.username, username);
    if (isActive) {
      const isValid = await verifyPassword(username, password, 'logins');
      debugLog(`${username} password =`, isValid);
      
      if (isValid) {
        successLog(`User ${username} logged in successfully.`);
        return true;
        
      } else {
        warnLog(`User ${username} invalid password.`);
        return false;
      }
    } else {
      warnLog(`User ${username} is inactive.`);
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
  updateLogin,
  loginUser,
  getRoles,
};


