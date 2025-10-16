const fs = require("fs");
const fsp = fs.promises;

const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const {
  funcName,
  fixStringType,
  arrayOfStringToDict,
  obj2ArrayOfObj,
  reduxArrayOfObj,
  reduxPropertiesOfObj,
} = require('./common.js');


const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;

// const log = require('log-utils');   // https://www.npmjs.com/package/log-utils
const color = {
  end: '\x1B[0m',
  k: '\x1B[30m',
  r: '\x1B[31m',
  g: '\x1B[32m',
  y: '\x1B[33m',
  b: '\x1B[34m',
  m: '\x1B[35m',
  c: '\x1B[36m',
  w: '\x1B[37m',
  HIG: '\x1B[1m',
  LOW: '\x1B[2m',
  REV: '\x1B[3m',
  UND: '\x1B[4m',
  HGL: '\x1B[5m',
}
const ICON = {
  success:  '\x1B[92m✔️\x1B[39m',
  error:    '\x1B[31m❌\x1B[39m',
  warn:     '\x1B[33m🔺\x1B[39m',
  info:     '\x1B[36m💬\x1B[39m',
  debug:    '\x1B[35m🔎\x1B[39m',
}
const LEVEL = {
  success:  color.g+color.LOW+'[SUCCESS]'+color.end,
  error:    color.r+color.LOW+'[ERROR]  '+color.end,
  warn:     color.y+color.LOW+'[WARNING]'+color.end,
  info:     color.k+color.HIG+'[INFO]   '+color.end,
  debug:    color.k+color.HIG+'[DEBUG]  '+color.end,
}
// ['debug','log','info','warn','error'].forEach((method, level)=>{
   // const type = method.toUpperCase(), native = console[method];
   // console[method] = Object.assign(
      // function(...args){
         // native((new Date).toISOString(), type+':', args.join(' ').replace(/(\r\n|\r|\n)/g, '\t'));
      // }, { native }
   // );
// });
async function logger(level, message='', data = '') {
  // console[level](`[\x1B[90m${(new Date).toLocaleTimeString()}\x1B[39m]`, ICON[level], color.k+color.HIG+LEVEL[level]+color.end, color.LOW+funcName(4)+color.end, message, data);
  console.log(`[\x1B[90m${(new Date).toLocaleTimeString()}\x1B[39m]`, ICON[level], color.k+color.HIG+LEVEL[level], color.LOW+funcName(4)+color.end, message, data);
}
async function successLog(message, data = '') { logger('success', message, data) }
async function errorLog(message, data = '') { logger('error', message, data) }
async function warnLog(message, data = '') { logger('warning', message, data) }
async function infoLog(message, data = '')  { logger('info', message, data) }
async function debugLog(message, data = '') { if (debug) logger('debug', message, data) }


// Helper function to format memory size
function formatMemorySize(bytes) {
  if (bytes === 0) return '0B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + sizes[i];
}


function jsonFixTrailingCommas(jsonString, returnJson=false) {
  var jsonObj;
  eval('jsonObj = ' + jsonString);
  if (returnJson) return jsonObj;
  else return JSON.stringify(jsonObj);
}


async function execCommand(command) {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`Executing system command: ${command}`);
  return execInContainer(command);
}


/**
 * Executes a setup.sh command in the docker-mailserver container
 * @param {string} setupCommand Command to pass to setup.sh
 * @return {Promise<string>} stdout from the command
 */
async function execSetup(setupCommand) {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`Executing setup command: ${setupCommand}`);
  return execCommand(`${SETUP_SCRIPT} ${setupCommand}`);
}


/**
 * Executes a command in the docker-mailserver container
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
async function execInContainer(command) {
  try {
    debugLog(`Executing command in container ${DMS_CONTAINER}: ${command}`);

    // Get container instance
    const container = docker.getContainer(DMS_CONTAINER);

    // Create exec instance
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    });

    // Start exec instance
    const stream = await exec.start();

    // Collect output
    return new Promise((resolve, reject) => {
      let stdoutData = '';
      let stderrData = '';

      stream.on('data', (chunk) => {
        // Docker multiplexes stdout/stderr in the same stream
        // First 8 bytes contain header, actual data starts at 8th byte
        stdoutData += String(chunk.slice(8));
      });

      stream.on('end', () => {
        // debugLog(`Command completed. Output:`, stdoutData);
        if (stdoutData.match(/ERROR/))
          reject(stdoutData);
        else
          resolve(stdoutData);
      });

      stream.on('error', (err) => {
        debugLog(`Command error:`, err);
        reject(err);
      });
    });
  } catch (error) {
    let backendError = 'Execution error for '+command ;
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


async function readJson(jsonFile) {
  var json = {};

  debugLog(`readJson: start trying to read ${jsonFile}`);
  try {
    debugLog(`readJson: now checking if exist ${jsonFile}`);
    
    if (fs.existsSync(jsonFile)) {
      debugLog(`readJson: now trying to read ${jsonFile}`);
      
      const data = await fsp.readFile(jsonFile, "utf8");
      json = JSON.parse(Buffer.from(data));
      debugLog(`readJson: got json from ${jsonFile}`);
      
    } else {
      debugLog(`readJson: empty ${jsonFile}`);
    }
  } catch (error) {
    errorLog(`readJson: ${jsonFile} read error:`, error);
    throw new Error('readJson Error reading '+jsonFile);
  }
  return json;
}



async function writeJson(DB_JSON, DBdict) {
  // await mutex.runExclusive(async () => {
    
    if (DBdict.constructor == Object) {
      try {

        // fs.writeFileSync(DB_JSON, JSON.stringify(DBdict, null, 2), 'utf8');
        await fsp.writeFile(DB_JSON, JSON.stringify(DBdict, null, 2), 'utf8');
        infoLog(`writeJson: Wrote DBdict into ${DB_JSON}`);

        
      } catch (error) {
        errorLog(`writeJson: ${DB_JSON} write error:`, error);
        throw new Error('Error writting DB_JSON');
      }
    } else {
      errorLog(`writeJson: DBdict not an Object:`, DBdict);
      throw new Error('writeJson Error: DBdict not an Object');
    }
  // });
}


async function formatDMSError(errorMsg, error) {
  // Unfortunately, we cannot list all the error types from dms just here
  // var patterns = [
    // /'?\S+'? is already an alias for recipient: '?\S+'?/i,
  // ]
  
  // patterns.forEach(function(regex){
    // if (typeof error == "string") {
      // if (error.match(regex)) errorMsg = `${errorMsg}: ` + error.match(regex)[0].replace(/[\"\'\:]/g, "");
    // } else {
      // if (error.message.match(regex)) errorMsg = `${errorMsg}: ` + error.message.match(regex)[0].replace(/[\"\'\:]/g, "");
    // }
  // });
  
  var splitErrorClean = '';
  if (error) {
    var split;
    const regexSplit = /ERROR:?|\n/i;
    const regexCleanup = /[\"\'\:\`]/g;
    
    if (typeof error == "string") {
      split = error.split(regexSplit);
    } else {
      split = error.message.split(regexSplit);
    }
    
    const splitError = (split.length > 1) ? split[1] : split[0];
    splitErrorClean = splitError.replace(regexColors,"").replace(regexPrintOnly,"").replace(regexCleanup, "")
  }
  
  errorMsg = `${errorMsg}: ${splitErrorClean}`;
  return errorMsg;
}



module.exports = {
  funcName,
  fixStringType,
  arrayOfStringToDict,
  obj2ArrayOfObj,
  reduxArrayOfObj,
  reduxPropertiesOfObj,
  color,
  ICON,
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  docker,
  formatMemorySize,
  jsonFixTrailingCommas,
  formatDMSError,
  execSetup,
  execCommand,
  readJson,
  writeJson,
  regexColors,
  regexPrintOnly,
};
