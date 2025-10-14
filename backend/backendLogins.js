require('./env.js');
const {
  formatMemorySize,
  jsonFixTrailingCommas,
  fixStringType,
  formatDMSError,
  debugLog,
  execSetup,
  execCommand,
  readJson,
  writeJson,
} = require('./backend.js');
const {
  arrayOfStringToDict,
  obj2ArrayOfObj,
  reduxArrayOfObj,
  reduxPropertiesOfObj,
} = require('./frontend.js');
require('./db.js');

const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const fs = require("fs");
const fsp = fs.promises;
const crypto = require('node:crypto');


const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// const regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;


// Function to retrieve logins
async function getLogins() {
  var DBdict = {};
  var logins = {};
  debugLog(`${arguments.callee.name}: start`);
  
  try {
    
    debugLog(`${arguments.callee.name}: calling DBdict readJson(${DB_Logins})`);
    DBdict = await readJson(DB_Logins);
    debugLog(`${arguments.callee.name}: DBdict:`, DBdict);
    
    // we could read DB_Logins and it is valid
    if (DBdict.constructor == Object && 'logins' in DBdict) {
      debugLog(`${arguments.callee.name}: Found ${Object.keys(DBdict['logins']).length} entries in DB_Logins`);
      return DBdict['logins'];
      
    // we could not read DB_Logins or it is invalid
    } else {
      console.log(`${arguments.callee.name}: ${DB_Logins} is empty`);
    }
    
    return logins;
    
  } catch (error) {
    let backendError = 'Error retrieving logins';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// deprecated
async function saveLoginsJson(username, password, email='') {
  DBdict = {
    logins:{
      username: username,
      email: email,
      password: password,
    }
  };
  
  try {
    debugLog(`${arguments.callee.name}: Saving logins:`,DBdict.logins);
    await writeJson(DB_Logins, DBdict);
    return { success: true };

  } catch (error) {
    let backendError = 'Error saving logins';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
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


async function saveLogins(username, password, email) {
  const { salt, hash } = await hashPassword(password);

  try {
    debugLog(`${arguments.callee.name}: ${username}`);
    dbRun(sql.logins.insert.login, {username:username, salt:salt, hash:hash, email:email});
    return { success: true };

  } catch (error) {
    let backendError = `Error saving username ${username}`;
    let ErrorMsg = `${error.code}: ${error.message}`;
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


async function verifyPassword(username, password) {
  try {
    debugLog(`${arguments.callee.name}: for ${username}`);
    const result = dbGet(sql.logins.select.saltHash, [username]);
    
  } catch (error) {
    let backendError = `Error verifyPassword for username ${username}`;
    let ErrorMsg = `${error.code}: ${error.message}`;
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }

  return new Promise((resolve, reject) => {
    if (result) {
      if (result.salt && result.hash) {
        crypto.scrypt(password, result.salt, 64, (err, derivedKey) => {
          if (err) return reject(err);
          resolve(result.hash === derivedKey.toString('hex'));
        });
      }
      return reject("salt of hash missing, please reset password");
    } else return reject(`username ${username} not found`);
  });
};



async function loginUser(username, password) {
  const isValid = await verifyPassword(username, password);
  debugLog(`${arguments.callee.name}: isValid=${isValid}`);
  if (isValid) {
    console.log(`User ${username} logged in successfully.`);
    return true;
  } else {
    console.log('Invalid username or password.');
    return false;
  }
}


module.exports = {
  getLogins,
  saveLogins,
};


