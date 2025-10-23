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


// this returns an array of objects
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
    let backendError = `getLogins: ${error.message}`;
    errorLog(backendError);
    throw new Error(backendError);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}


async function addLogin(username, password, email='') {
  try {
    debugLog(username);
    
    const { salt, hash } = await hashPassword(password);
    dbRun(sql.logins.insert.login, { username:username, salt:salt, hash:hash, email:email });
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
      dbRun(sql.logins.update.password, { salt:salt, hash:hash }, username);
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


async function deleteLogin(username) {

  try {
    const logins = await dbAll(sql.logins.select.logins);
    debugLog(`pulled ${logins.length} logins`);

    if (logins.length > 1) {
      debugLog(`Deleting login: ${username}`);
      dbRun(sql.logins.delete.login, username);
      if (!result.exitCode) {
      
        successLog(`Login deleted: ${username}`);
        return { success: true };
      
      } else errorLog(result.stderr);
      
    } else errorLog("Cannot delete the last login, how will you log back in?");
    
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
  getLogins,
  addLogin,
  loginUser,
};


