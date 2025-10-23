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
async function getLogins() {

  debugLog(`start`);
  try {
    
    const logins = await dbAll(sql.logins.select.logins);
    debugLog(`logins: ${typeof logins}`, logins);
    
    // we could read DB_Logins and it is valid
    if (logins && logins.length) {
      infoLog(`Found ${logins.length} entries in logins`);
      return logins;
      // [ { username: username, email: email }, ..]
      
    } else {
      warnLog(`logins in db seems empty:`, logins);
      return [];
    }
    
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


async function saveLogin(username, password, email='') {
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
  saveLogin,
  loginUser,
};


