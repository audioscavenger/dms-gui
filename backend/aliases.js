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
  getContainer,
} = require('./backend');

const {
  sql,
  dbRun,
  dbAll,
  dbGet,
  deleteEntry,
} = require('./db');

const fs = require("fs");
const fsp = fs.promises;
const crypto = require('node:crypto');


async function getAliases(refresh, containerName) {
  refresh = (refresh === undefined) ? false : refresh;
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`(refresh=${refresh} for ${containerName}`);
  
  var aliases = [];
  try {
    
      if (!refresh) {
      aliases = await dbAll(sql.aliases.select.aliases, {scope:containerName});
      
      // we could read DB_Logins and it is valid
      if (aliases && aliases.length) {
        infoLog(`Found ${aliases.length} entries in aliases`);
        
        return aliases;
        // [ { source: 'a@b.com', destination:'b@b.com', regex: 0 }, .. ]
        
      } else {
        warnLog(`db aliases seems empty:`, aliases);
        return [];
      }
    }
    
    // refresh
    // virtual aliases: -------------------------------
    aliases = await pullAliasesFromDMS(containerName);
    
    infoLog(`got ${aliases.length} aliases from pullAliasesFromDMS(${containerName})`);

    // now add the alias type and scope
    aliases = aliases.map(alias => { return { ...alias, regex: 0, scope:containerName }; });

    // regex aliases: -------------------------------
    var regexes = await pullPostfixRegexFromDMS(containerName);
    infoLog(`got ${regexes.length} regexes from pullPostfixRegexFromDMS(${containerName})`);

    // now add the alias type
    regexes = regexes.map(alias => { return { ...alias, regex: 1, scope:containerName }; });
    
    // now merge aliases and regexes ---------------
    aliases = [ ...aliases, ...regexes ];
    
    // now save aliases in db ----------------------
    const result = dbRun(sql.aliases.insert.alias, aliases);
    if (!result.success) {
      errorLog(result.message);
    }
    
    return aliases;
    
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


// Function to retrieve aliases from DMS
async function pullAliasesFromDMS(containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  var aliases = [];
  const command = 'alias list';
  try {
    debugLog(`execSetup(${command})`);
    const results = await execSetup(command, containerName);
    debugLog('ddebug results',results)
    if (!results.returncode) {
      aliases = await parseAliasesFromDMS(results.stdout);
      
    } else {
      let ErrorMsg = await formatDMSError('execSetup', results.stderr);
      errorLog(ErrorMsg);
    }

    infoLog(`Found ${aliases.length} aliases`);
    return aliases;
    
  } catch (error) {
    let backendError = `Error execSetup(${command}): ${error}`;
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


async function parseAliasesFromDMS(stdout) {
  var aliases = [];
  
  // Parse each line in the format "* source destination"
  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  debugLog(`Raw alias list response:`, lines);

  // Modified regex to be more tolerant of control characters that might appear in the output
  const emailLineValidChars = /[^\w\.\~\.\-_@\s\*\%]/g;
  const regexAliasDMS = /\*\s+(\S+@\S+)\s+(\S+@\S+)/;

  for (let i = 0; i < lines.length; i++) {
    // Clean the line from binary control characters
    const line = lines[i].replace(emailLineValidChars, '').trim();

    if (line.includes('*')) {
      const match = line.match(regexAliasDMS);
      if (match) {
        const source = match[1];
        const destination = match[2];
        debugLog(`Parsed alias: ${source} -> ${destination}`);

        aliases.push({
          source,
          destination,
        });
      } else {
        warnLog(`Failed to parse alias line: ${line}`);
      }
    }
  }

  return aliases;
}


async function pullPostfixRegexFromDMS(containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  var regexes = [];
  const command = `cat ${DMS_CONFIG_PATH}/postfix-regexp.cf`;
  try {
    debugLog(`execSetup(${command})`);
    const results = await execCommand(command, containerName);
    if (!results.returncode) {
      
      regexes = await parsePostfixRegexFromDMS(results.stdout);
      
    } else {
      let ErrorMsg = await formatDMSError('execSetup', results.stderr);
      errorLog(ErrorMsg);
    }

    infoLog(`Found ${regexes.length} regexes`);
    return regexes;
    
  } catch (error) {
    let backendError = `Error execSetup(${command}): ${error}`;
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


async function parsePostfixRegexFromDMS(stdout) {
  var regexes = [];
  
  // Parse each line in the format "* source destination"
  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  debugLog(`Raw regex list response:`, lines);
  // /^abuse.*@.*.*/ admin@example.com
  // /^postmaster.*@.*.*/ admin@example.com

  // specific regex for postfix regex
  for (let i = 0; i < lines.length; i++) {
    // Clean the line from binary control characters
    const match = lines[i].match(regexMatchPostfix);

    if (match) {
      const source = JSON.stringify(match[1]);
      const destination = match[2];
      debugLog(`Parsed regex: ${source} -> ${destination}`);

      regexes.push({
        source,
        destination,
      });
    } else {
      warnLog(`Failed to parse regex line: ${line}`);
    }
  }
  return regexes;
}


// Function to add an alias
async function addAlias(source, destination, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    
    if (source.match(regexEmailStrict)) {
      debugLog(`Adding new alias: ${source} -> ${destination}`);
    
      const results = await execSetup(`alias add ${source} ${destination}`, containerName);
      if (!results.returncode) {
        
        const result = dbRun(sql.aliases.insert.alias, {source:source, destination:destination, regex:0, scope:containerName});
        if (result.success) {
          successLog(`Alias created: ${source} -> ${destination}`);
          return { success: true, message: `Alias created: ${source} -> ${destination}` };
          
        } else return result;
        
      } else {
        let ErrorMsg = await formatDMSError('execSetup', results.stderr);
        errorLog(ErrorMsg);
        return { success: false, message: ErrorMsg };
      }
        
    // this is a regex
    } else {
      debugLog(`Adding new regex: ${source} -> ${destination}`);
      
      const results = await execCommand(`echo '${source} ${destination}' >>${DMS_CONFIG_PATH}/postfix-regexp.cf`, containerName);
      if (!results.returncode) {
        
        // reload postfix
        const results2 = await execCommand(`postfix reload`, containerName);
        if (!results2.returncode) {
          
          const result = dbRun(sql.aliases.insert.alias, {source:JSON.stringify(source), destination:destination, regex:1, scope:containerName});
          if (result.success) {
            successLog(`Alias regex created: ${source} -> ${destination}`);
            return { success: true, message: `Alias regex created: ${source} -> ${destination}` };
            
          } else return result;
          
        } else {
          errorLog(results2.stderr);
          return { success: false, message: results2.stderr };
        }
        
      } else {
        errorLog(results.stderr);
        return { success: false, message: results.stderr };
      }
      
    }
    
  } catch (error) {
    let backendError = 'Unable to add alias';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

// Function to delete an alias
async function deleteAlias(source, destination, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    
    if (source.match(regexEmailStrict)) {
      debugLog(`Deleting alias: ${source}`);
      
      const results = await execSetup(`alias del ${source} ${destination}`, containerName);
      if (!results.returncode) {
        const result = deleteEntry('aliases', source, 'bySource', containerName);
        if (result.success) {
          successLog(`Alias deleted: ${source}`);
          return { success: true, message: `Alias deleted: ${source}` };
          
        } else return result;
        
      } else {
        let ErrorMsg = await formatDMSError('execSetup', results.stderr);
        errorLog(ErrorMsg);
        return { success: false, message: ErrorMsg };
      }
    
    // this is a regex
    } else {
      debugLog(`Deleting alias regex: ${source}`);
      
      const results = await execCommand(`grep -Fv "${source} ${destination}" ${DMS_CONFIG_PATH}/postfix-regexp.cf >/tmp/postfix-regexp.cf && mv /tmp/postfix-regexp.cf ${DMS_CONFIG_PATH}/postfix-regexp.cf`, containerName);
      if (!results.returncode) {
        
        // reload postfix
        const results2 = await execCommand(`postfix reload`, containerName);
        if (!results2.returncode) {
          
          const result = deleteEntry('aliases', JSON.stringify(source), 'bySource', containerName);
          if (result.success) {
            successLog(`Alias regex deleted: ${source}`);
            return { success: true, message: `Alias regex deleted: ${source}` };
            
          } else return result;
          
        } else {
          return { success: false, message: results2.stderr };
          errorLog(results.stderr);
        }
        
      } else {
        return { success: false, message: results.stderr };
        errorLog(results.stderr);
      }

    }
    
  } catch (error) {
    let backendError = 'Unable to delete alias';
    let ErrorMsg = await formatDMSError(backendError, error);
    errorLog(`${backendError}:`, ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}


module.exports = {
  getAliases,
  addAlias,
  deleteAlias,
};


