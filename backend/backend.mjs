import { exec as execCb } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import { promisify } from 'node:util';
const exec = promisify(execCb);

// const Docker = require('dockerode');
// const docker = new Docker({ socketPath: '/var/run/docker.sock' });

import {
  funcName,
  reduxPropertiesOfObj,
  regexColors,
  regexPrintOnly
} from '../common.mjs';
import {
  env
} from './env.mjs';


// const log = require('log-utils');   // https://www.npmjs.com/package/log-utils
export const color = (env.LOG_COLORS) ? {
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
  kLOW: '\x1B[90m',
} : {
  end: '',
  k: '',
  r: '',
  g: '',
  y: '',
  b: '',
  m: '',
  c: '',
  w: '',
  HIG: '',
  LOW: '',
  REV: '',
  UND: '',
  HGL: '',
}
export const ICON = (env.LOG_COLORS) ? {
  success:  '\x1B[92m✔️\x1B[39m ',
  error:    '\x1B[31m❌\x1B[39m ',
  warn:     '\x1B[33m🔺\x1B[39m',
  info:     '\x1B[36m💬\x1B[39m',
  debug:    '\x1B[35m🔎\x1B[39m',
} : {
  success:  '✔️ ',
  error:    '❌ ',
  warn:     '🔺',
  info:     '💬',
  debug:    '🔎',
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
  console.log(`[${color.kLOW}${(new Date).toLocaleTimeString()}${color.end}`, ICON[level], color.k+color.HIG+LEVEL[level], color.LOW+funcName(4)+(level == 'debug' ? '' : color.end), message, ...data, color.end);
};

export const successLog = async (message, ...data) => { logger('success', message, ...data) };
export const errorLog = async (message, ...data) => { logger('error', message, ...data) };
export const warnLog = async (message, ...data) => { logger('warn', message, ...data) };
export const infoLog = async (message, ...data) => { logger('info', message, ...data) };
export const debugLog = async (message, ...data) => { if (env.debug) logger('debug', message, ...data) };


/**
 * Executes a setup.sh command in the docker-mailserver container
 * @param {string} setupCommand Command to pass to setup.sh
 * @return {Promise<string>} stdout from the command
 */
export const execSetup = async (setupCommand, targetDict, ...rest) => {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  // const command = `${env.DMS_SETUP_SCRIPT} ${setupCommand}`;
  const command = `${targetDict.setupPath} ${setupCommand}`;
  debugLog(`Executing setup command: ${setupCommand}`);
  return execCommand(command, targetDict, ...rest);
};


export const execCommand = async (command, targetDict, ...rest) => {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`Executing system command: ${command}`);
  const result = await execInContainerAPI(command, targetDict, ...rest);
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
 * Executes a checkPort connect to a server
 * @param {object} targetDict with protocol, host, port, Authorization
 * @return {Promise<object>} with returncode, stdout and stderr
 */
export const checkPort = async (targetDict) => {
  return new Promise((resolve) => {

    if (env.isDEMO) return {success: true, message: 'running'};
    try {
      const socket = new net.Socket();
      socket.setTimeout((targetDict?.timeout || 0.3) * 1000);   // we don't accept less then 300ms reply time

      // Attempt to connect to the specified host and port
      socket.connect(targetDict.port, targetDict.host, () => {
        socket.end(); // Close the connection immediately after success
        resolve({success: true, message: 'running'});
      });

      socket.on('error', () => {
        socket.destroy();
        resolve({success: false, error: 'error'});
      });

      // Handle 'timeout' events
      socket.on('timeout', () => {
        socket.destroy();
        resolve({success: false, error: 'timeout'});
      });

      return {success: true, message: 'running'};

    } catch (error) {
      errorLog('error:', error.message);
      return {success: false, error: error.message};
    }
  });
}


/**
 * Executes a ping to a server
 * @param {string} host
 * @return {Promise<object>} with returncode, stdout and stderr
 */
export const ping = async (host) => {

  if (env.isDEMO) return {success: true, message: "mock response"};
  try {
    const { stdout, stderr } = await exec(`ping -q -c 1 -A ${host}`);
    // debugLog(`stdout: ${stdout}`);
    if (stderr) {
      errorLog(`stderr: ${stderr}`);
      return {success: false, error: stderr};
    }

    return {success: true, message: stdout};

  } catch (error) {
    errorLog('error:', error.message);
    return {success: false, error: error.message};
  }

}


/**
 * Executes a command in the docker-mailserver container through an http API
 * @param {string} command Command to execute
 * @param {object} targetDict with protocol, host, port, Authorization and maybe timeout
 * @return {Promise<object>} with returncode, stdout and stderr
 */
export const execInContainerAPI = async (command, targetDict, ...rest) => {
  
  if (env.isDEMO) return {returncode:0, stdout:"mock response"};
  let result;
  try {
    if (!targetDict || (targetDict && Object.keys(reduxPropertiesOfObj(targetDict, ['protocol', 'host', 'port', 'Authorization'])).length < 4) ) {
      return {
        returncode: 99,
        stderr: 'targetDict needs 4 keys: protocol, host, port, Authorization',
      };
    };

    result = await checkPort(targetDict);
    // debugLog('ddebug checkPort result',result)   // { success: false, error: 'running' } // whyyyyyyyyyyyyy
    if (result.success) {

      const jsonData = Object.assign({}, 
        {
          command: command,
          timeout: (targetDict?.timeout || env.timeout),
        },
        ...rest);

      debugLog(`${targetDict.protocol}://${targetDict.host}:${targetDict.port}`)
      const response = await postJsonToApi(`${targetDict.protocol}://${targetDict.host}:${targetDict.port}`, jsonData, targetDict.Authorization)
      // debugLog('ddebug response',response)

      if ('error' in response) {
        errorLog('response:', response);
        return {
          returncode: 99,
          stderr: response.error.toString('utf8'),
        };
        
      } else {
        successLog('command:', command);
        return {
          returncode: response.returncode,
          stdout: response.stdout.toString('utf8'),
          stderr: response.stderr.toString('utf8'),
        };
      }
    } else {
      return {
        returncode: 99,
        stderr: checkPort.message,
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
export const postJsonToApi = async (apiUrl, jsonData, Authorization) => {
  // debugLog('ddebug apiUrl', apiUrl)
  // debugLog('ddebug DMS_API_KEY', DMS_API_KEY)
  // debugLog('ddebug jsonData', jsonData)
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': Authorization
      },
      body: JSON.stringify(jsonData),
    });

    // debugLog('ddebug response', response)
    if (!response.ok) {
      throw new Error(`HTTP POST error! status: ${response.status}`);
    }

    const responseData = await response.json(); // Parse the JSON response
    // debugLog('API response:', responseData);
    return responseData;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }
};


/**
 * Generic API function get
 * @param {string} apiUrl API url like http://whatever:8888
 * @return {Promise<string>} stdout from the fetch
 */
export const getJsonFromApi = async (apiUrl, Authorization) => {

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': Authorization,
      },
    });

    // debugLog('ddebug response', response)
    if (!response.ok) {
      throw new Error(`HTTP GET error! status: ${response.status}`);
    }

    const responseData = await response.json(); // Parse the JSON response
    debugLog('Received JSON data:', responseData);
    return responseData;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
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

    stream.on('error', (error) => {
      debugLog(`Command error:`, error);
      reject(error);
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
    return json;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }
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
    errorLog(error.message);
    throw new Error(error.message);
  }
};


export const writeFile = async (file, content) => {
  
  try {

    // fs.writeFileSync(file, content, 'utf8');
    await fs.promises.writeFile(file, content, 'utf8');
    successLog(`${file}`);

    
  } catch (error) {
    errorLog(error.message);
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
  if (!live.[containerName]) live.containers[containerName] = docker.getContainer(containerName);
  return live.containers[containerName];
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
//   formatDMSError,
//   execSetup,
//   execCommand,
//   readJson,
//   writeJson,
//   writeFile,
//   getContainer,
//   processTopData,
// };
