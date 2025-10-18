require('./env.js');
const {
  docker,
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  formatMemorySize,
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
} = require('./db.js');

const fs = require("fs");
const fsp = fs.promises;
const crypto = require('node:crypto');


const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// const regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;


// TODO: this returns a single object, should return an array
async function getLogins() {

  debugLog(`start`);
  try {
    
    const logins = await dbAll(sql.logins.select.logins);
    debugLog(`logins: ${typeof logins}`, logins);
    
    // we could read DB_Logins and it is valid
    if (logins && logins.length) {
      debugLog(`Found ${logins.length} entries in logins`);
      return logins[0];
      // { username: username, email: email }
      
    } else {
      debugLog(`logins in db seems empty:`, logins);
      return {};
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


// deprecated
async function getLoginsJson() {
  var DBdict = {};
  var logins = {};
  debugLog(`start`);
  
  try {
    
    debugLog(`calling DBdict readJson(${DB_Logins})`);
    DBdict = await readJson(DB_Logins);
    debugLog(`DBdict:`, DBdict);
    
    // we could read DB_Logins and it is valid
    if (DBdict.constructor == Object && 'logins' in DBdict) {
      debugLog(`Found ${Object.keys(DBdict['logins']).length} entries in DB_Logins`);
      return DBdict['logins'];
      
    // we could not read DB_Logins or it is invalid
    } else {
      infoLog(`${arguments.callee.name}: ${DB_Logins} is empty`);
    }
    
    return logins;
    
  } catch (error) {
    let backendError = 'Error retrieving logins';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}


// deprecated
async function saveLoginsJson(username, password, email='') {
  DBdict = {
    logins:{
      username: username,
      password: password,
      email: email,
    }
  };
  
  try {
    debugLog(`Saving logins:`,DBdict.logins);
    await writeJson(DB_Logins, DBdict);
    return { success: true };

  } catch (error) {
    let backendError = 'Error saving logins';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex'); // Generate a random 16-byte salt
    crypto.scrypt(password, salt, 64, (err, derivedKey) => { // 64 is the key length
      if (err) return reject(err);
      resolve({ salt, hash: derivedKey.toString('hex') }); // Store salt and hash as hex strings
    });
  });
}


async function saveLogins(username, password, email='') {
  try {
    const { salt, hash } = await hashPassword(password);
    debugLog(`${username}`);
    dbRun(sql.logins.insert.login, {username:username, salt:salt, hash:hash, email:email});
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


async function verifyPassword(username, password) {
  
  try {
    debugLog(`for ${username}`);
    const result = dbGet(sql.logins.select.saltHash, username);

    return new Promise((resolve, reject) => {
      if (Object.keys(result).length) {
        if (result.salt && result.hash) {
          crypto.scrypt(password, result.salt, 64, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(result.hash === derivedKey.toString('hex'));
          });
        } else return reject(`please reset password for ${username}`);
      } else return reject(`username ${username} not found`);
    });

  } catch (error) {
    let backendError = error.message;
    errorLog(`${backendError}`);
    throw new Error(backendError);
  }

};



async function loginUser(username, password) {
  
  try {
    const isValid = await verifyPassword(username, password);
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
  saveLogins,
  loginUser,
};


