const fs = require("fs");
const fsp = fs.promises;

const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });


const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;



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


async function debugLog(message, data = null) {
  // try {
    // throw new Error('stack hack to get callee.caller in strict mode')
  // } catch (error) {
    
    // console.log(`[debug] error.stack:`, error.stack.split('\n')[2]);
      // error.stack: Error: First one
    // at debugLog (/app/backend/dockerMailserver.js:18:11)
    // at Object.getAccounts (/app/backend/dockerMailserver.js:150:11)
    // at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    // at async /app/backend/index.js:69:22
  // }
  
  if (debug) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}


/**
 * Executes a setup.sh command in the docker-mailserver container
 * @param {string} setupCommand Command to pass to setup.sh
 * @return {Promise<string>} stdout from the command
 */
async function execSetup(setupCommand) {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`${arguments.callee.name}: Executing setup command: ${setupCommand}`);
  return execInContainer(`${SETUP_SCRIPT} ${setupCommand}`);
}


async function execCommand(command) {
  // The setup.sh script is usually located at /usr/local/bin/setup.sh or /usr/local/bin/setup in docker-mailserver
  
  debugLog(`${arguments.callee.name}: Executing system command: ${command}`);
  return execInContainer(command);
}


/**
 * Executes a command in the docker-mailserver container
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
async function execInContainer(command) {
  try {
    debugLog(`${arguments.callee.name}: Executing command in container ${DMS_CONTAINER}: ${command}`);

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
        // debugLog(`${arguments.callee.name}: Command completed. Output:`, stdoutData);
        if (stdoutData.match(/ERROR/))
          reject(stdoutData);
        else
          resolve(stdoutData);
      });

      stream.on('error', (err) => {
        debugLog(`${arguments.callee.name}: Command error:`, err);
        reject(err);
      });
    });
  } catch (error) {
    let backendError = 'Execution error for '+command ;
    let ErrorMsg = await formatDMSError(backendError, error);
    debugLog(`${arguments.callee.name}: ${backendError}:`, error);
    throw new Error(error);
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
    console.error(`readJson: ${jsonFile} read error:`, error);
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
        console.log(`writeJson: Wrote DBdict into ${DB_JSON}`);

        
      } catch (error) {
        console.error(`writeJson: ${DB_JSON} write error:`, error);
        throw new Error('Error writting DB_JSON');
      }
    } else {
      console.error(`writeJson: DBdict not an Object:`, DBdict);
      throw new Error('writeJson Error: DBdict not an Object');
    }
  // });
}




module.exports = {
  docker,
  formatMemorySize,
  jsonFixTrailingCommas,
  formatDMSError,
  debugLog,
  execSetup,
  execCommand,
  readJson,
  writeJson,
  regexColors,
  regexPrintOnly,
};
