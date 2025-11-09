import fs from 'node:fs';

// const Docker = require('dockerode');
// const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// const {
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
//   getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
// } = require('./common');
import {
  funcName
} from '../common.js';
import {
  env,
  live
} from './env.js';


// const log = require('log-utils');   // https://www.npmjs.com/package/log-utils
export const color = {
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
export const ICON = {
  success:  '\x1B[92m✔️\x1B[39m',
  error:    '\x1B[31m❌\x1B[39m',
  warn:     '\x1B[33m🔺\x1B[39m',
  info:     '\x1B[36m💬\x1B[39m',
  debug:    '\x1B[35m🔎\x1B[39m',
}
export const LEVEL = {
  success:  color.g+color.LOW+'[SUCCESS]'+color.end,
  error:    color.r+color.LOW+'[ERROR]  '+color.end,
  warn:     color.y+color.LOW+'[WARN]   '+color.end,
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
export const logger = async (level, message='', ...data) => {
  // console[level](`[\x1B[90m${(new Date).toLocaleTimeString()}\x1B[39m]`, ICON[level], color.k+color.HIG+LEVEL[level]+color.end, color.LOW+funcName(4)+color.end, message, data);
  console.log(`[\x1B[90m${(new Date).toLocaleTimeString()}\x1B[39m]`, ICON[level], color.k+color.HIG+LEVEL[level], color.LOW+funcName(4)+(level == 'debug' ? '' : color.end), message, ...data, color.end);
};

export const successLog = async (message, ...data) => { logger('success', message, ...data) };
export const errorLog = async (message, ...data) => { logger('error', message, ...data) };
export const warnLog = async (message, ...data) => { logger('warn', message, ...data) };
export const infoLog = async (message, ...data) => { logger('info', message, ...data) };
export const debugLog = async (message, ...data) => { if (env.debug) logger('debug', message, ...data) };


export const jsonFixTrailingCommas = (jsonString, returnJson=false) => {
  var jsonObj;
  eval('jsonObj = ' + jsonString);
  if (returnJson) return jsonObj;
  else return JSON.stringify(jsonObj);
};


/**
 * Executes a setup.sh command in the docker-mailserver container
 * @param {string} setupCommand Command to pass to setup.sh
 * @return {Promise<string>} stdout from the command
 */
export const execSetup = async (setupCommand, containerName, ...rest) => {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`Executing setup command: ${setupCommand}`);
  return execCommand(`${env.DMS_SETUP_SCRIPT} ${setupCommand}`, containerName, ...rest);
};


export const execCommand = async (command, containerName, ...rest) => {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`Executing system command: ${command}`);
  // return execInContainer(command, containerName);
  const result = await execInContainerAPI(command, containerName, ...rest);
  // debugLog('ddebug result', result)
  return result;
};


/**
 * Executes a command in the docker-mailserver container through docker.sock
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
/*
async function execInContainer(command, containerName) {
 // Get container instance
 const container = getContainer(containerName);

 // Ensure the container is running before attempting to exec
 const containerInfo = await container.inspect();
 if (!containerInfo.State.Running) {
 throw new Error(`Container ${containerId} is not running.`);
 }

 const execOptions = {
 Cmd: ['sh', '-c', command],
 AttachStdout: true,
 AttachStderr: true,
 Tty: false, // Must be false to properly capture streams
 };

 try {
 const exec = await container.exec(execOptions);

 const stream = await exec.start();

 // Collect the streams output
 const stdoutBuffer = [];
 const stderrBuffer = [];
 let returncode;

 const processExit = new Promise((resolve, reject) => {
   docker.modem.demuxStream(stream, {
     write: chunk => stdoutBuffer.push(chunk),
   }, {
     write: chunk => stderrBuffer.push(chunk),
   });

   stream.on('end', async () => {
     const execInfo = await exec.inspect();
     returncode = execInfo.ExitCode;
     resolve();
   });

   stream.on('error', reject);
 });

 await processExit;

 if (returncode == 0) {successLog(command);} else {warnLog(command);}
 return {
   returncode: returncode,
   stdout: Buffer.concat(stdoutBuffer).toString('utf8'),
   stderr: Buffer.concat(stderrBuffer).toString('utf8'),
 };
 } catch (error) {
 console.error('Error during exec:', error);
 throw error;
 }
}
*/


/**
 * Executes a command in the docker-mailserver container through an http API
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
export const execInContainerAPI = async (command, containerName, ...rest) => {
  
    // api_key: live.DMS_API_KEY,  // moved to the Authorization header
  const jsonData = Object.assign({}, 
    {
      command: command,
      timeout: 1,
    },
    ...rest);
  
  try {
    debugLog(`http://${containerName}:${live.DMS_API_PORT}`)
    const response = await sendJsonToApi(`http://${containerName}:${live.DMS_API_PORT}`, jsonData)
    // debugLog('ddebug response',response)

    if ('error' in response) {
      errorLog('response:', response);
      return {
        returncode: 99,
        stderr: response.error.toString('utf8'),
      };
      
    } else {
      successLog('response:', response);
      return {
        returncode: response.returncode,
        stdout: response.stdout.toString('utf8'),
        stderr: response.stderr.toString('utf8'),
      };
    }
  } catch (error) {
    errorLog('error:', error.message);
    return {
      returncode: 99,
      stderr: error.message,
    };
  }
};


/**
 * Generic API function post
 * @param {string} apiUrl API url like http://whatever:8888
 * @return {Promise<string>} stdout from the fetch
 */
export const sendJsonToApi = async (apiUrl, jsonData) => {
  // debugLog('ddebug apiUrl', apiUrl)
  // debugLog('ddebug live.DMS_API_KEY', live.DMS_API_KEY)
  // debugLog('ddebug jsonData', jsonData)
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST', // or 'PUT'
      headers: {
        'Content-Type': 'application/json',
        'Authorization': live.DMS_API_KEY
      },
      body: JSON.stringify(jsonData), // Convert JavaScript object to JSON string
    });

    // debugLog('ddebug response', response)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json(); // Parse the JSON response
    // debugLog('API response:', responseData);
    return responseData;
    
  } catch (error) {
    errorLog('Error sending JSON to API:', error);
    throw error;
  }
};


/**
 * Generic API function get
 * @param {string} apiUrl API url like http://whatever:8888
 * @return {Promise<string>} stdout from the fetch
 */
export const getJsonFromApi = async apiUrl => {
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json', // Indicate that you expect JSON
        // Add any other necessary headers
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json(); // Parse the JSON response
    debugLog('Received JSON data:', jsonData);
    return jsonData;
    
  } catch (error) {
    errorLog('Error fetching JSON from API:', error);
    throw error;
  }
};


/**
 * // https://github.com/orgs/docker-mailserver/discussions/2908#discussioncomment-14867771
 * Executes a command in the docker-mailserver container through a named pipe
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
/*
async function execInContainerPipe(command, containerName) {
import { fetch, Agent } from 'undici'

const url = "http://localhost/setup";
const cli_args = ["email", "add", "jane.doe@example.test", "secret password"];

const uds = new Agent({ connect: { socketPath: '/var/run/dms-api/api.sock' } })
const fetch_config = {
  dispatcher: uds,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(cli_args),
};

try {
  const response = await fetch(url, fetch_config);
  const cli_output = await response.text();
  console.log(cli_output);
} finally {
  await uds.close()
}
}
*/


/**
 * Executes a command in the docker-mailserver container
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
/*
async function execInContainerOLD(command, containerName) {
try {
  debugLog(`Executing command in container ${containerName}: ${command}`);

  // Get container instance
  const container = getContainer(containerName);

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
*/


export const readJson = async jsonFile => {
  var json = {};

  debugLog(`start to read ${jsonFile}`);
  try {
    debugLog(`checking if exist ${jsonFile}`);
    
    if (fs.existsSync(jsonFile)) {
      debugLog(`reading ${jsonFile}`);
      
      const data = await fs.promises.readFile(jsonFile, "utf8");
      json = JSON.parse(Buffer.from(data));
      successLog(`json from ${jsonFile}`);
      debugLog(`json from ${jsonFile}`, json);
      
    } else {
      warnLog(`empty ${jsonFile}`);
    }
    
  } catch (error) {
    errorLog(`${jsonFile} read error:`, error.message);
    throw new Error(error.message);
  }
  return json;
};



export const writeJson = async (jsonFile, DBdict) => {
  
  if (DBdict.constructor == Object) {
    try {

      await writeFile(jsonFile, JSON.stringify(DBdict, null, 2));
      successLog(`DBdict into ${jsonFile}`);

      
    } catch (error) {
      errorLog(`${jsonFile} write error:`, error.message);
      throw new Error(error.message);
    }
  } else {
    errorLog(`DBdict not an Object:`, DBdict);
    throw new Error('DBdict not an Object');
  }
};


export const writeFile = async (file, content) => {
  
  try {

    // fs.writeFileSync(file, content, 'utf8');
    await fs.promises.writeFile(file, content, 'utf8');
    successLog(`${file}`);

    
  } catch (error) {
    errorLog(`${file} write error:`, error.message);
    throw new Error(error.message);
  }
};


export const formatDMSError = async (errorMsg, error) => {
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
};


/*
// foolproof future where we can deal with multiple containers
export const getContainer = containerName => {
  containerName = (containerName) ? containerName : live.DMS_CONTAINER;
  if (!containers[containerName]) global.containers[containerName] = docker.getContainer(containerName);
  return containers[containerName];
};
*/


// module.exports = {
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
//   getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
//   color,
//   ICON,
//   debugLog,
//   infoLog,
//   warnLog,
//   errorLog,
//   successLog,
//   docker,
//   jsonFixTrailingCommas,
//   formatDMSError,
//   execSetup,
//   execCommand,
//   readJson,
//   writeJson,
//   writeFile,
//   getContainer,
//   processTopData,
// };
