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


// this returns an objects
async function getLogin(username) {
  try {
    
    const login = await dbGet(sql.logins.select.login, username);
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

  debugLog(`start`);
  try {
    
    const logins = await dbAll(sql.logins.select.logins);
    debugLog(`pulled ${logins.length} logins`);
    
    // we could read DB_Logins and it is valid
    if (logins.length) {
      infoLog(`Found ${logins.length} entries in logins`);
      
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


async function addLogin(username, password, email='', isAdmin=0) {
  console.debug('ddebug password, email',password, email)
  try {
    debugLog(username, password, email, isAdmin);
    
    const { salt, hash } = await hashPassword(password);
    dbRun(sql.logins.insert.login, { username:username, salt:salt, hash:hash, email:email, isAdmin:isAdmin });
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
    const result = await execSetup(`username update ${username} ${password}`);
    if (!result.exitCode) {
      
      const { salt, hash } = await hashPassword(password);
      dbRun(sql.logins.update.password, { username:username, salt:salt, hash:hash });
      successLog(`Password updated for login: ${username}`);
      return { success: true };
      
    } else errorLog(result.stderr);
    
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
    let validDict = reduxPropertiesOfObj(jsonDict, Object.keys(validKeys.logins));
    if (Object.keys(validDict).length = 0) {
      throw new Error('nothing valid was passed');
    }
    
    debugLog(`Updating login ${username} with validDict:`, validDict);    // { isAdmin: true }
    for (const [key, value] of Object.entries(validDict)) {
      if (key == 'password') {
        return changePasswordLogin(username, value);
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


async function loginUser(username, password) {
  
  try {
    const isValid = await verifyPassword(username, password, 'logins');
    debugLog(`${username} password =`, isValid);
    
    if (isValid) {
      successLog(`User ${username} logged in successfully.`);
      return true;
      
    } else {
      warnLog(`User ${username} invalid password.`);
      return false;
    }
  } catch (error) {
    let backendError = error.message;
    errorLog(`${backendError}`);
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
};


