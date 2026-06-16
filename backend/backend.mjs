import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execCb);

import fs from 'node:fs';
import net from 'node:net';

// const Docker = require('dockerode');
// const docker = new Docker({ socketPath: '/var/run/docker.sock' });

import {
  funcName,
  reduxPropertiesOfObj,
  regexColors,
  regexPrintOnly
} from '../common.mjs';
import {
  getTargetDict
} from './db.mjs';
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
  error:    '\x1B[31m❌\x1B[39m',
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
  success:  color.g+color.LOW+'[SUCCESS] '+color.end,
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
  console.log(`[${color.kLOW}${(new Date).toLocaleTimeString()}]${color.end}`, ICON[level], color.k+color.HIG+LEVEL[level], color.LOW+funcName(4)+(level == 'debug' ? '' : color.end), message, ...data, color.end);
};

export const successLog = async (message, ...data) => { logger('success', message, ...data) };
export const errorLog = async (message, ...data) => { logger('error', message, ...data) };
export const warnLog = async (message, ...data) => { logger('warn', message, ...data) };
export const infoLog = async (message, ...data) => { logger('info', message, ...data) };
export const debugLog = async (message, ...data) => { if (env.debug) logger('debug', message, ...data) };


// doveadm function for mailboxes
// https://doc.dovecot.org/2.4.1/core/admin/doveadm.html
export const doveadm = async (schema='dms', containerName=null, command=null, mailbox=null, jsonDict={}) => {   // jsonDict = {field:"messages unseen vsize", box:"INBOX Junk"}
  if (!mailbox) return {success: false, error: 'mailbox is null'};
  if (!command) return {success: false, error: 'command is null'};
  if (!containerName) return {success: false, error: 'containerName is null'};
  const anonymizedJsonDict = (jsonDict?.password) ? {...jsonDict, password: '********'} : jsonDict;
  debugLog(`for ${containerName}: ${command} ${mailbox}`, anonymizedJsonDict);

  // https://doc.dovecot.org/main/core/summaries/doveadm.html
  // https://manpages.ubuntu.com/manpages/jammy/man1/doveadm-mailbox.1.html
  const doveadm = {
    
    // https://doc.dovecot.org/main/core/summaries/doveadm.html#index
    // Index user mailbox folder or folders.
    index: {
      mailbox: true,
      cmd: 'doveadm index -u {mailbox} -q \\*',
      defaults: {
        none: null,
      },
      api: [["index", {"mailboxMask": "{box}", "allUsers": false, "user": "{mailbox}"}, "dms-gui"]],
      stdout: false,
      messages: {
        pass: 'Reindexing started for {mailbox}',
      },
    },

    // https://doc.dovecot.org/main/core/summaries/doveadm.html#indexer%20list
    // List queued index requests.
    indexerList: {
      mailbox: true,
      cmd: 'doveadm index list {mailbox}',
      defaults: {
        none: null,
      },
      api: [["index", {"userMask": "{mailbox}"}, "dms-gui"]],
      stdout: true,
      messages: {
        pass: 'Queued index requests for {mailbox}:',
      },
    },
    
    // https://doc.dovecot.org/main/core/summaries/doveadm.html#mailbox%20list
    // Get list of existing mailboxes.
    list: {
      mailbox: true,
      cmd: 'doveadm mailbox list -u {mailbox}',
      defaults: {
        none: null,
      },
      stdout: true,
      messages: {
        pass: 'Folder list for {mailbox}:',
      },
      // Junk
      // Drafts
      // Trash
      // Sent
      // INBOX
    },

    // https://doc.dovecot.org/main/core/summaries/doveadm.html#mailbox%20list
    // https://doc.dovecot.org/main/core/man/doveadm-mailbox.1.html#mailbox-list
    // When the -s option is present, only subscribed mailboxes will be listed. Listed subscriptions may also contain mailboxes that are already deleted.
    listSubscribed: {
      mailbox: true,
      cmd: 'doveadm mailbox list -u {mailbox} -s',
      defaults: {
        none: null,
      },
      stdout: true,
      messages: {
        pass: 'Subscribed folder list for {mailbox}:',
      },
      // Junk
      // Drafts
      // Trash
      // Sent
    },
    
    // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20metadata%20list
    // List metadata for a mailbox.
    metaGet: {
      mailbox: true,
      cmd: 'doveadm mailbox metadata list -p -u {mailbox} {box}',
      defaults: {
        box: 'INBOX',
      },
      stdout: true,
      messages: {
        pass: 'Metadata for {mailbox}/{box}:',
      },
      // /private/specialuse
      // /shared/vendor/vendor.dovecot/pvt/server/admin
      // /shared/vendor/vendor.dovecot/pvt/server/comment
    },

    // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#mailbox%20status
    // Show status of mailboxes.
    mailboxStatus: {
      mailbox: true,
      cmd: 'doveadm mailbox status -u {mailbox} {field} {box}',
      api: [["mailboxStatus", {"field": ["{field}"], "user": "{mailbox}", "mailboxMask": ["{box}"]}, "dms-gui"]],
      defaults: {
        field: 'all',
        box: 'INBOX',
      },
      stdout: true,
      messages: {
        pass: 'Status from {mailbox}/{box}:',
      },
      // INBOX messages=5119 recent=0 uidnext=5125 uidvalidity=1759246520 unseen=703 highestmodseq=356 vsize=459768297 guid=68e18d2db8f8db68550f00008e1fe135 firstsaved=1759247564
    },
    
    // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#force%20resync
    // Under certain circumstances Dovecot may be unable to automatically solve problems with mailboxes. 
    // In such situations the force-resync command may be helpful. It tries to fix all problems. 
    forceResync: {
      mailbox: true,
      cmd: 'doveadm force-resync -u {mailbox} --mailbox-mask {box}',
      api: [["forceResync", {"allUsers": false, "user": "{mailbox}", "mailboxMask": "{box}"}, "dms-gui"]],
      defaults: {
        box: 'INBOX',
      },
      stdout: false,
      messages: {
        pass: 'Force-resync started for {mailbox}/{box}',
      },
      // doveadm(user@domain.com): Info: FTS Xapian: Optimize (1) : Checking expunges from db_6076763531fadb68571400008e1fe135_exp.db
      // doveadm(user@domain.com): Info: FTS Xapian: Optimize (1) : Checking expunges from db_e170c41cf00be3687d3400008e1fe135_exp.db
    },

    // https://doc.dovecot.org/2.4.1/core/summaries/doveadm.html#auth%20test
    // Test authentication for a user.
    // doveadm auth test ${login.message.mailbox} '${password}'
    loginUser: {
      mailbox: true,
      cmd: `doveadm auth test {mailbox} '{password}'`,
      api: [["auth", {"user": "{mailbox}", "password": "{password}"}, "dms-gui"]],    // TODO: TBD, I did not bother to check
      defaults: {
        none: null,
      },
      stdout: false,
      messages: {
        pass: '{mailbox} logged in',
      },
      timeout: 4,
    },
  }

  try {
    if (!doveadm[command]) throw new Error(`unknown command: ${command}`);
    const targetDict = getTargetDict('mailserver', containerName);
    if (doveadm[command].timeout) targetDict.timeout = doveadm[command].timeout;
    
    let jsonDictMerged = {...doveadm[command]?.defaults, ...jsonDict};
    let formattedCommand = doveadm[command].cmd.replace(/{mailbox}/g, mailbox);
    let formattedPass    = doveadm[command].messages.pass.replace(/{mailbox}/g, mailbox);

    // variables replacement in cmd and pass message
    for (const [key, value] of Object.entries(jsonDictMerged)) {
        formattedCommand =  formattedCommand.replace(`{${key}}`, value);
        formattedPass =     formattedPass.replace(`{${key}}`, value);
      }
    
    const results = await execCommand(formattedCommand, targetDict);
    if (!results?.returncode) {
      successLog(formattedPass, results.stdout);
      return { success: true, message: results.stdout };
      
    } else {
      errorLog(results.stderr);
      return { success: false, error: results.sterr, returncode: results?.returncode };
    }
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


/**
 * Executes a setup.sh command in the docker-mailserver container
 * @param {string} setupCommand Command to pass to setup.sh
 * @return {Promise<string>} stdout from the command
 */
export const execDMS = async (setupCommand=null, targetDict={}, ...rest) => {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  const command = `${targetDict.setupPath} ${setupCommand}`;
  const anonymizedCommand = command
    .replace(/(email add \S+) ([\S]+)/, "$1 '********'")            // `email add mail@x.y 'password'` -> `email add mail@x.y '********'`
    .replace(/(doveadm auth test \S+) ([\S]+)/, "$1 '********'");   // `doveadm auth test mail@x.y 'password'` -> `doveadm auth test mail@x.y '********'`
  debugLog(`Executing setup command: ${anonymizedCommand}`);

  return execCommand(command, targetDict, ...rest);
};


export const execCommand = async (command=null, targetDict={}, ...rest) => {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  const anonymizedCommand = command
    .replace(/(email add \S+) ([\S]+)/, "$1 '********'")            // `email add mail@x.y 'password'` -> `email add mail@x.y '********'`
    .replace(/(doveadm auth test \S+) ([\S]+)/, "$1 '********'");   // `doveadm auth test mail@x.y 'password'` -> `doveadm auth test mail@x.y '********'`
  debugLog(`Executing system command: ${anonymizedCommand}`);

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
export const checkPort = async (targetDict={}) => {
  return new Promise((resolve) => {

    if (env.isDEMO) return {success: true, message: 'port_open'};
    try {
      const socket = new net.Socket();
      socket.setTimeout((targetDict?.timeout ?? 0.3) * 1000);   // we don't accept less then 300ms reply time

      // Attempt to connect to the specified host and port
      socket.connect(targetDict.port, targetDict.host, () => {
        socket.end(); // Close the connection immediately after success
        resolve({success: true, message: 'port_open'});
      });

      socket.on('error', (error) => {
        // console.error(`Error message: ${error.message}`);   // connect ECONNREFUSED 172.19.0.3:8888
        // console.error(`Error code: ${error.code}`);         // 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'
        // console.error(`System call: ${error.syscall}`);     // 'connect'
        // console.error(`Address: ${error.address}`);         // 172.19.0.3
        // console.error(`Port: ${error.port}`);               // 8888
        socket.destroy();
        resolve({success: false, message: 'port_closed: ' + error.code});
      });

      // Handle 'timeout' events
      socket.on('timeout', () => {
        socket.destroy();
        resolve({success: false, message: 'port_timeout'});
      });

      return {success: false, message: 'port_unknown'};       // should never happen

    } catch (error) {
      errorLog('error:', error.message);
      return {success: false, message: error.message};
    }
  });
}


/**
 * Executes a ping to a server
 * @param {string} host
 * @return {Promise<object>} with returncode, stdout and stderr
 */
export const ping = async (host=null) => {

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
export const execInContainerAPI = async (command=null, targetDict={}, ...rest) => {
  
  if (env.isDEMO) return {returncode:0, stdout:"mock response"};
  let result;
  try {
    // debugLog('ddebug targetDict', targetDict);
    // debugLog("ddebug reduxPropertiesOfObj(targetDict, ['protocol', 'host', 'port', 'Authorization']))", reduxPropertiesOfObj(targetDict, ['protocol', 'host', 'port', 'Authorization']));
    if (!targetDict || (targetDict && Object.keys(reduxPropertiesOfObj(targetDict, ['protocol', 'host', 'port', 'Authorization'])).length < 4) ) {
      return {
        returncode: 99,
        stderr: 'targetDict needs 4 keys: protocol, host, port, Authorization',
      };
    };

    result = await checkPort(targetDict);
    // debugLog('ddebug checkPort result',result)   // { success: false, error: 'running' } // whyyyyyyyyyyyyy
    if (result.success) {

      const anonymizedCommand = command
        .replace(/(email add \S+) ([\S]+)/, "$1 '********'")            // `email add mail@x.y 'password'` -> `email add mail@x.y '********'`
        .replace(/(doveadm auth test \S+) ([\S]+)/, "$1 '********'");   // `doveadm auth test mail@x.y 'password'` -> `doveadm auth test mail@x.y '********'`

      const jsonData = Object.assign({}, 
        {
          command: command,
          timeout: Number(targetDict?.timeout ?? env.timeout),
        },
        ...rest);

      debugLog(`${targetDict.protocol}://${targetDict.host}:${targetDict.port}`)
      // debugLog(`targetDict`, targetDict);
      // debugLog(`jsonData`, jsonData);
      const response = await postJsonToApi(`${targetDict.protocol}://${targetDict.host}:${targetDict.port}`, jsonData, targetDict.Authorization)
      // debugLog('ddebug response',response)

      if ('error' in response) {
        errorLog('response:', response);
        return {
          returncode: 99,
          stderr: response.error.toString('utf8'),    // example: Invalid api_key: api_error: xxx-491c1cfd-86ec-49ba-b962-ce0bce5ff189
        };
        
      } else {
        successLog('command:', anonymizedCommand);  
        return {
          returncode: response.returncode,
          stdout: response.stdout.toString('utf8'),
          stderr: response.stderr.toString('utf8'),
        };
      }
    } else {
      debugLog('error:', result);
      return {
        returncode: 99,
        stderr: result.message,
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
export const postJsonToApi = async (apiUrl=null, jsonData={}, Authorization=null) => {
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

    debugLog('ddebug response', response);
    // valid API key:
    // Response {
    //   status: 200,
    //   statusText: 'OK',
    //   headers: Headers {
    //     server: 'BaseHTTP/0.6 Python/3.11.2',
    //     date: 'Sun, 21 Dec 2025 05:35:39 GMT',
    //     'content-type': 'application/json'
    //   },
    //   body: ReadableStream { locked: false, state: 'readable', supportsBYOB: true },
    //   bodyUsed: false,
    //   ok: true,
    //   redirected: false,
    //   type: 'basic',
    //   url: 'http://dms:8888/'
    // }

    // exception:
    // Response {
    //   status: 500,
    //   statusText: 'Internal Server Error',
    //   headers: Headers {
    //     server: 'BaseHTTP/0.6 Python/3.11.2',
    //     date: 'Sun, 21 Dec 2025 05:36:53 GMT',
    //     'content-type': 'application/json'
    //   },
    //   body: ReadableStream { locked: false, state: 'readable', supportsBYOB: true },
    //   bodyUsed: false,
    //   ok: false,
    //   redirected: false,
    //   type: 'basic',
    //   url: 'http://dms:8888/'
    // }

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
export const getJsonFromApi = async (apiUrl=null, Authorization=null) => {

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


export const readJson = async (jsonFile=null) => {
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



export const writeJson = async (jsonFile=null, DBdict={}) => {
  
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


export const writeFile = async (file=null, content='') => {
  
  try {

    // fs.writeFileSync(file, content, 'utf8');
    await fs.promises.writeFile(file, content, 'utf8');
    successLog(`${file}`);
    return {success: true, message: file};

    
  } catch (error) {
    errorLog(error.message);
    return {success: false, error: error.message};
    // throw new Error(error.message);
  }
};


// examples:
// let ErrorMsg = await formatDMSError('execDMS', results.stderr);
// let ErrorMsg = await formatDMSError('addAccount', results.stderr);
export const formatDMSError = async (errorMsg=null, error=null) => {
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
//   execDMS,
//   execCommand,
//   readJson,
//   writeJson,
//   writeFile,
//   getContainer,
//   processTopData,
// };

// dms commands to implement:
// SETUP(1)

// NAME
//     setup - 'docker-mailserver' Administration & Configuration CLI

// SYNOPSIS
//     setup [ OPTIONS... ] COMMAND [ help | ARGUMENTS... ]

//     COMMAND := { email | alias | quota | dovecot-master | config | relay | debug } SUBCOMMAND

// DESCRIPTION
//     This is the main administration command that you use for all your interactions with
//     'docker-mailserver'. Initial setup, configuration, and much more is done with this CLI tool.

//     Most subcommands can provide additional information and examples by appending 'help'.
//     For example: 'setup email add help'

// [SUB]COMMANDS
//     COMMAND email :=
//         setup email add <EMAIL ADDRESS> [<PASSWORD>]
//         setup email update <EMAIL ADDRESS> [<PASSWORD>]
//         setup email del [ OPTIONS... ] <EMAIL ADDRESS> [ <EMAIL ADDRESS>... ]
//         setup email restrict <add|del|list> <send|receive> [<EMAIL ADDRESS>]
//         setup email list

//     COMMAND alias :=
//         setup alias add <EMAIL ADDRESS> <RECIPIENT>
//         setup alias del <EMAIL ADDRESS> <RECIPIENT>
//         setup alias list

//     COMMAND quota :=
//         setup quota set <EMAIL ADDRESS> [<QUOTA>]
//         setup quota del <EMAIL ADDRESS>

//     COMMAND dovecot-master :=
//         setup dovecot-master add <USERNAME> [<PASSWORD>]
//         setup dovecot-master update <USERNAME> [<PASSWORD>]
//         setup dovecot-master del [ OPTIONS... ] <USERNAME> [ <USERNAME>... ]
//         setup dovecot-master list

//     COMMAND config :=
//         setup config dkim [ ARGUMENTS... ]

//     COMMAND relay :=
//         setup relay add-auth <DOMAIN> <USERNAME> [<PASSWORD>]
//         setup relay add-domain <DOMAIN> <HOST> [<PORT>]
//         setup relay exclude-domain <DOMAIN>

//     COMMAND fail2ban :=
//         setup fail2ban
//         setup fail2ban ban <IP>
//         setup fail2ban unban <IP>
//         setup fail2ban log
//         setup fail2ban status

//     COMMAND debug :=
//         setup debug fetchmail
//         setup debug getmail
//         setup debug login <COMMANDS>
//         setup debug show-mail-logs

// EXAMPLES
//     setup email add test@example.com
//         Add the email account test@example.com. You will be prompted
//         to input a password afterwards since no password was supplied.

//     setup config dkim keysize 2048 domain 'example.com,not-example.com'
//         Creates keys of length 2048 for the domains in comma-seperated list.
//         This is necessary when using LDAP as the required domains cannot be inferred.

//     setup config dkim help
//         This will provide you with a detailed explanation on how to use the
//         config dkim command, showing what arguments can be passed and what they do.


// was used for testing, we will likely never implement doveadm API
/*
export const doveadmAPIforTesting = async (containerName=null, command=null, mailbox=null, jsonDict={}) => {

// https://doc.dovecot.org/main/core/admin/doveadm.html
// https://doc.dovecot.org/2.3/admin_manual/doveadm_http_api/
// https://doc.dovecot.org/main/core/admin/doveadm.html#example-session
// let doveadm_api_key = crypto.randomUUID();

// 99-api.conf
  // doveadm_password = doveadm_password
  // doveadm_api_key = "c9ed3894-7c23-4e71-be7e-bb23cff5d55e"

  // service doveadm {
     // unix_listener doveadm-server {
        // user = dovecot
     // }

    // inet_listener {
      // port = 2425
    // }

    // inet_listener http {
      // port = 8080
      // # For HTTPS, uncomment the line below:
      // # ssl = yes
    // }
  // }


// API_KEY=$(echo -n c9ed3894-7c23-4e71-be7e-bb23cff5d55e|base64)
// DOVEADM_PASS=$(echo -n doveadm:doveadm_password|base64)


// curl -H "Authorization: Basic $DOVEADM_PASS" http://localhost:8080/doveadm/v1
// curl -u doveadm:doveadm_password http://localhost:8080/doveadm/v1

// curl -H "Authorization: X-Dovecot-API $API_KEY" http://localhost:2425/
  // curl: (52) Empty reply from server

// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" http://localhost:8080/doveadm/v1
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["reload",{},"dms-gui"]]' http://localhost:8080/doveadm/v1 
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["mailboxStatus", {"field": ["messages"], "mailboxMask": ["INBOX"], "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[{"mailbox":"INBOX","messages":"24"}],"c01"]]
  
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["mailboxStatus", {"field": ["all"], "mailboxMask": ["INBOX"], "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[{"mailbox":"INBOX","messages":"24","recent":"24","uidnext":"25","uidvalidity":"1759246897","unseen":"24","highestmodseq":"3","vsize":"752111","guid":"6076763531fadb68571400008e1fe135","firstsaved":"1759246897"}],"dms-gui"]]

// https://doc.dovecot.org/main/core/summaries/doveadm.html#indexer%20list  // not in 2.3
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["indexerList", {"userMask": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["error",{"type":"unknownMethod", "returncode":0},"dms-gui"]]


// https://doc.dovecot.org/main/core/summaries/doveadm.html#force%20resync
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["forceResync", {"allUsers": false, "mailboxMask": "INBOX*", "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[],"dms-gui"]]


// https://doc.dovecot.org/main/core/summaries/doveadm.html#acl%20get       // not in 2.3
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["aclGet", {"allUsers": false, "mailbox": "INBOX", "user": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["error",{"type":"unknownMethod", "returncode":0},"dms-gui"]]

// https://doc.dovecot.org/main/core/summaries/doveadm.html#auth%20test     // not in 2.3
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["authTest", {"user": "diane@domain.com", "password": "password"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["error",{"type":"unknownMethod", "returncode":0},"dms-gui"]]
// doveadm auth test diane@domain.com "password"
  // passdb: diane@domain.com auth failed
// doveadm auth test diane@domain.com "M....!"
  // passdb: diane@domain.com auth succeeded

// https://doc.dovecot.org/main/core/summaries/doveadm.html#who
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["who", {"mask": "chloe@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[{"username":"chloe@domain.com","connections":"2","service":"imap","pids":"(13846 13842)","ips":"(63.225.200.129)"}],"dms-gui"]]
// https://doc.dovecot.org/2.3/admin_manual/doveadm_http_api/#doveadm-who
// curl -H "Authorization: X-Dovecot-API $API_KEY" -H "Content-Type: application/json" -d '[["who", {"mask": "diane@domain.com"}, "dms-gui"]]' http://localhost:8080/doveadm/v1
  // [["doveadmResponse",[],"dms-gui"]]
  
// test DMS API:
// curl -H "Authorization: dms-d6657c97-2f43-40c6-8104-3e3d43478f41" -H "Content-Type: application/json" -d '{"command":"ls -l"}' http://dms:8888
  

// https://doc.dovecot.org/main/core/admin/doveadm.html#example-session
// Requests that fail before the doveadm command is run returns 400/500 HTTP response codes:
  // Code	Reason
  // 400	Invalid request. Response body contains error message in text/plain.
  // 401	Unauthorized (missing authentication).
  // 403	Forbidden (authentication failed).
  // 404	Unknown doveadm command.
  // 500	Internal server error (see Dovecot logs for more information).

};
*/


                                                                                                                              
// https://patorjk.com/software/taag/#p=display&f=Big+Mono+9&t=doveconf+-P&x=none&v=4&h=4&w=80&we=false                                                                                                                   
//      █                                                                                                                        
//      █                                       █                                                                     █          
//      █                                       █                                                                     █          
//   ██▓█   ███   █░ ░█   ███    ▓██▒   ███   █████                █▒██▒          █▒██▒  ███   █▓██    ███    █▒██▒ █████  ▒███▒ 
//  █▓ ▓█  █▓ ▓█  ▓▒ ▒▓  ▓▓ ▒█  ▓█  ▓  █▓ ▓█    █                  █▓ ▒█          ██  █ ▓▓ ▒█  █▓ ▓█  █▓ ▓█   ██  █   █    █▒ ░█ 
//  █   █  █   █  ▒█ █▒  █   █  █░     █   █    █                  █   █          █     █   █  █   █  █   █   █       █    █▒░   
//  █   █  █   █   █ █   █████  █      █   █    █            ███   █   █          █     █████  █   █  █   █   █       █    ░███▒ 
//  █   █  █   █   █▓█   █      █░     █   █    █                  █   █          █     █      █   █  █   █   █       █       ▒█ 
//  █▓ ▓█  █▓ ▓█   ▒█▒   ▓▓  █  ▓█  ▓  █▓ ▓█    █░                 █   █          █     ▓▓  █  █▓ ▓█  █▓ ▓█   █       █░   █░ ▒█ 
//   ██▓█   ███    ░█░    ███▒   ▓██▒   ███     ▒██                █   █          █      ███▒  █▓██    ███    █       ▒██  ▒███▒ 
//                                                                                             █                                 
// docker exec -it dms dovecot -n reports
/*
  # 2.3.19.1 (9b53102964): /etc/dovecot/dovecot.conf
  # Pigeonhole version 0.5.19 (4eae2f79)
  # OS: Linux 6.8.0-31-generic x86_64 Debian 12.11 ext4
  # Hostname: mx.domain.com
  auth_master_user_separator = *
  auth_mechanisms = plain login
  auth_verbose = yes
  auth_verbose_passwords = sha1:6
  doveadm_api_key = # hidden, use -P to show it
  doveadm_password = # hidden, use -P to show it
  hostname = mx.domain.com
  lda_mailbox_autocreate = yes
  lda_mailbox_autosubscribe = yes
  listen = *
  mail_home = /var/mail/%d/%n/home/
  mail_location = maildir:/var/mail/%d/%n
  mail_plugins = " quota fts fts_xapian zlib"
  mail_privileged_group = docker
  maildir_stat_dirs = yes
  managesieve_notify_capability = mailto
  managesieve_sieve_capability = fileinto reject envelope encoded-character vacation subaddress comparator-i;ascii-numeric relational regex imap4flags copy include variables body enotify environment mailbox date index ihave duplicate mime foreverypart extracttext special-use imapflags notify imapsieve vnd.dovecot.imapsieve vnd.dovecot.pipe vnd.dovecot.filter
  namespace inbox {
    inbox = yes
    location =
    mailbox Drafts {
      auto = subscribe
      special_use = \Drafts
    }
    mailbox Junk {
      auto = subscribe
      special_use = \Junk
    }
    mailbox Sent {
      auto = subscribe
      special_use = \Sent
    }
    mailbox Trash {
      auto = subscribe
      special_use = \Trash
    }
    prefix =
  }
  passdb {
    args = scheme=SHA512-CRYPT username_format=%u /etc/dovecot/userdb
    driver = passwd-file
    mechanisms = plain login
  }
  passdb {
    args = scheme=SHA512-CRYPT username_format=%u /etc/dovecot/masterdb
    driver = passwd-file
    master = yes
    result_success = continue
  }
  plugin {
    fts = xapian
    fts_autoindex = yes
    fts_autoindex_exclude = \Trash
    fts_autoindex_exclude2 = \Junk
    fts_enforced = yes
    fts_xapian = partial=3 full=20 verbose=0
    imapsieve_mailbox1_before = file:/usr/lib/dovecot/sieve-pipe/learn-spam.sieve
    imapsieve_mailbox1_causes = COPY
    imapsieve_mailbox1_name = Junk
    imapsieve_mailbox2_before = file:/usr/lib/dovecot/sieve-pipe/learn-ham.sieve
    imapsieve_mailbox2_causes = COPY
    imapsieve_mailbox2_from = Junk
    imapsieve_mailbox2_name = INBOX
    quota = count:User quota
    quota_grace = 10%%
    quota_max_mail_size = 314M
    quota_rule = *:storage=5242M
    quota_rule2 = Trash:storage=+50M
    quota_status_nouser = DUNNO
    quota_status_overquota = 552 5.2.2 Mailbox is full
    quota_status_success = DUNNO
    quota_vsizes = yes
    quota_warning = storage=95%% quota-warning 95 %u %d
    quota_warning2 = storage=80%% quota-warning 80 %u %d
    quota_warning3 = -storage=100%% quota-warning below %u %d
    sieve = ~/.dovecot.sieve
    sieve_after = /usr/lib/dovecot/sieve-global/after/
    sieve_before = /usr/lib/dovecot/sieve-global/before/
    sieve_dir = ~/sieve
    sieve_extensions = +notify +imapflags +special-use +vnd.dovecot.pipe +vnd.dovecot.filter
    sieve_filter_bin_dir = /usr/lib/dovecot/sieve-filter
    sieve_global_extensions = +editheader
    sieve_pipe_bin_dir = /usr/lib/dovecot/sieve-pipe
    sieve_plugins = sieve_imapsieve sieve_extprograms
    zlib_save = zstd
  }
  postmaster_address = postmaster@domain.com
  protocols = " imap lmtp sieve"
  service aggregator {
    chroot =
  }
  service anvil {
    chroot =
  }
  service auth {
    unix_listener /dev/shm/sasl-auth.sock {
      group = postfix
      mode = 0660
      user = postfix
    }
    unix_listener auth-master {
      group = docker
      mode = 0600
      user = docker
    }
    unix_listener auth-userdb {
      group = docker
      mode = 0666
      user = docker
    }
  }
  service director {
    chroot =
  }
  service doveadm {
    inet_listener {
      port = 2425
    }
    inet_listener http {
      port = 8080
    }
    unix_listener doveadm-server {
      user = dovecot
    }
  }
  service imap-login {
    chroot =
    inet_listener imaps {
      port = 993
      ssl = yes
    }
  }
  service imap-urlauth-login {
    chroot =
  }
  service imap {
    vsz_limit = 1 G
  }
  service indexer-worker {
    vsz_limit = 2 G
  }
  service ipc {
    chroot =
  }
  service lmtp {
    unix_listener lmtp {
      group = postfix
      mode = 0660
    }
  }
  service managesieve-login {
    chroot =
  }
  service old-stats {
    chroot =
  }
  service pop3-login {
    chroot =
    inet_listener pop3s {
      ssl = yes
    }
  }
  service quota-status {
    client_limit = 1
    executable = quota-status -p postfix
    inet_listener {
      address = 127.0.0.1
      port = 65265
    }
  }
  service quota-warning {
    executable = script /usr/local/bin/quota-warning
    unix_listener quota-warning {
      group = dovecot
      mode = 0660
      user = dovecot
    }
  }
  service stats {
    unix_listener stats-reader {
      mode = 00
    }
    unix_listener stats-writer {
      mode = 00
    }
  }
  service submission-login {
    chroot =
  }
  ssl = required
  ssl_cert = </etc/letsencrypt/live/domain.com/fullchain.pem
  ssl_cipher_list = ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
  ssl_dh = # hidden, use -P to show it
  ssl_key = # hidden, use -P to show it
  ssl_prefer_server_ciphers = yes
  stats_writer_socket_path =
  userdb {
    args = username_format=%u /etc/dovecot/userdb
    default_fields = uid=docker gid=docker home=/var/mail/%d/%u/home/
    driver = passwd-file
  }
  protocol lmtp {
    mail_plugins = " quota fts fts_xapian zlib sieve"
  }
  protocol imap {
    mail_plugins = " quota fts fts_xapian zlib zlib imap_quota imap_sieve"
  }
  protocol pop3 {
    mail_plugins = " quota fts fts_xapian zlib zlib"
  }
  protocol lda {
    mail_plugins = " quota fts fts_xapian zlib sieve"
  }
*/



                                                                             
// https://patorjk.com/software/taag/#p=display&f=Big+Mono+9&t=doveconf+-P&x=none&v=4&h=4&w=80&we=false                                                                                                                   
//      █                                              ▒██                      
//      █                                              █░                 █████░
//      █                                              █                  █   ▓█
//   ██▓█   ███   █░ ░█   ███    ▓██▒   ███   █▒██▒  █████                █    █
//  █▓ ▓█  █▓ ▓█  ▓▒ ▒▓  ▓▓ ▒█  ▓█  ▓  █▓ ▓█  █▓ ▒█    █                  █   ▓█
//  █   █  █   █  ▒█ █▒  █   █  █░     █   █  █   █    █                  █████░
//  █   █  █   █   █ █   █████  █      █   █  █   █    █            ███   █     
//  █   █  █   █   █▓█   █      █░     █   █  █   █    █                  █     
//  █▓ ▓█  █▓ ▓█   ▒█▒   ▓▓  █  ▓█  ▓  █▓ ▓█  █   █    █                  █     
//   ██▓█   ███    ░█░    ███▒   ▓██▒   ███   █   █    █                  █     
                                                                             
/*
# 2.3.19.1 (9b53102964): /etc/dovecot/dovecot.conf
# Pigeonhole version 0.5.19 (4eae2f79)
# OS: Linux 6.8.0-31-generic x86_64 Debian 12.11 ext4
# Hostname: mx.domain.com
# NOTE: Send doveconf -n output instead when asking for help.
auth_anonymous_username = anonymous
auth_cache_negative_ttl = 1 hours
auth_cache_size = 0
auth_cache_ttl = 1 hours
auth_cache_verify_password_with_worker = no
auth_debug = no
auth_debug_passwords = no
auth_default_realm =
auth_failure_delay = 2 secs
auth_gssapi_hostname =
auth_krb5_keytab =
auth_master_user_separator = *
auth_mechanisms = plain login
auth_policy_check_after_auth = yes
auth_policy_check_before_auth = yes
auth_policy_hash_mech = sha256
auth_policy_hash_nonce =
auth_policy_hash_truncate = 12
auth_policy_log_only = no
auth_policy_reject_on_fail = no
auth_policy_report_after_auth = yes
auth_policy_request_attributes = login=%{requested_username} pwhash=%{hashed_password} remote=%{rip} device_id=%{client_id} protocol=%s session_id=%{session}
auth_policy_server_api_header =
auth_policy_server_timeout_msecs = 2000
auth_policy_server_url =
auth_proxy_self =
auth_realms =
auth_socket_path = auth-userdb
auth_ssl_require_client_cert = no
auth_ssl_username_from_cert = no
auth_stats = no
auth_use_winbind = no
auth_username_chars = abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890.-_@
auth_username_format = %Lu
auth_username_translation =
auth_verbose = yes
auth_verbose_passwords = sha1:6
auth_winbind_helper_path = /usr/bin/ntlm_auth
auth_worker_max_count = 30
base_dir = /run/dovecot
config_cache_size = 1 M
debug_log_path =
default_client_limit = 1000
default_idle_kill = 1 mins
default_internal_group = dovecot
default_internal_user = dovecot
default_login_user = dovenull
default_process_limit = 100
default_vsz_limit = 256 M
deliver_log_format = msgid=%m: %$
dict_db_config =
director_flush_socket =
director_mail_servers =
director_max_parallel_kicks = 100
director_max_parallel_moves = 100
director_output_buffer_size = 10 M
director_ping_idle_timeout = 30 secs
director_ping_max_timeout = 1 mins
director_servers =
director_user_expire = 15 mins
director_user_kick_delay = 2 secs
director_username_hash = %Lu
disable_plaintext_auth = yes
dotlock_use_excl = yes
doveadm_allowed_commands =
doveadm_api_key = c9ed3894-7c23-4e71-be7e-bb23cff5d55e
doveadm_http_rawlog_dir =
doveadm_password = doveadm_password
doveadm_port = 0
doveadm_socket_path = doveadm-server
doveadm_ssl = no
doveadm_username = doveadm
doveadm_worker_count = 0
dsync_alt_char = _
dsync_commit_msgs_interval = 100
dsync_features =
...
 */


