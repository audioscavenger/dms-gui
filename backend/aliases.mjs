import {
  reduxArrayOfObjByValue,
  regexEmailStrict,
  regexMatchPostfix,
} from '../common.mjs';
import {
  debugLog,
  errorLog,
  execCommand,
  execSetup,
  formatDMSError,
  infoLog,
  successLog,
  warnLog,
} from './backend.mjs';
import {
  env
} from './env.mjs';

import {
  dbAll,
  dbRun,
  deleteEntry,
  getTargetDict,
  sql
} from './db.mjs';
import { getConfigs } from './settings.mjs';


export const getAliases = async (containerName, refresh, roles=[]) => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};
  refresh = (refresh === undefined) ? false : (env.isDEMO ? false : refresh);
  
  let aliases = [];
  let regexes = [];
  let result, config;
  
  try {
    
    // refresh
    if (refresh) {

      // get schema
      result = await getConfigs('mailserver', undefined, containerName);
      if (result.success) {
        config = result.message[0];
      
        // virtual aliases: -------------------------------
        if (config?.schema == 'dms') {
          result = await pullAliasesFromDMS(containerName);
        } else {
          errorLog(`unknown schema: ${config?.schema}`, result);
          throw new Error(`unknown schema: ${config?.schema}`);
        }
        
        if (result.success) {
          infoLog(`got ${result.message.length} aliases from pullAliasesFromDMS(${containerName})`);

          // now add the alias type and scope
          aliases = result.message.map(alias => { return { ...alias, regex: 0, scope:containerName }; });

          // regex aliases: -------------------------------
          result = await pullPostfixRegexFromDMS(containerName);
          if (result.success) {
            
            infoLog(`got ${result.message.length} regexes from pullPostfixRegexFromDMS(${containerName})`);
            // now add the alias type
            regexes = result.message.map(alias => { return { ...alias, regex: 1, scope:containerName }; });
          }
          
          // now merge aliases and regexes ---------------
          aliases = [ ...aliases, ...regexes ];
          
          // now save aliases in db ----------------------
          // alias:    `REPLACE INTO aliases (source, destination, regex, configID) VALUES (@source, @destination, @regex, (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = ?))`,
          result = dbRun(sql.aliases.insert.alias, aliases, containerName);
          if (!result.success) {
            errorLog(result?.error);
          }

          if (roles.length) result.message = reduxArrayOfObjByValue(aliases, 'destination', roles);
          return {success: true, message: aliases};

        } else errorLog('pullPostfixRegexFromDMS:', result?.error);

      } else errorLog(`getConfigs: ${containerName} not found`);
    }

    result = dbAll(sql.aliases.select.aliases, {}, containerName);
    if (result.success) {
      
      // we could read DB_Logins and it is valid
      if (result.message.length) {
        infoLog(`Found ${result.message.length} entries in aliases`);
        result.message = result.message.map(alias => { return { ...alias, source: (alias.regex) ? JSON.parse(alias.source) : alias.source}; });
        
      } else {
        warnLog(`db aliases seems empty:`, aliases);
      }
    }

    if (roles.length) result.message = reduxArrayOfObjByValue(result.message, 'destination', roles);
    return result;
    
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
};


// Function to retrieve aliases from DMS: returnes [{source, destination}]
export const pullAliasesFromDMS = async containerName => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};

  let aliases = [];
  const command = 'alias list';
  
  try {
    const targetDict = getTargetDict('mailserver', containerName);

    debugLog(`execSetup(${command})`);
    const results = await execSetup(command, targetDict);
    // debugLog('ddebug results',results)
    
    if (!results.returncode) {
      aliases = await parseAliasesFromDMS(results.stdout);
      infoLog(`Found ${aliases.length} aliases`);
      
    } else {
      let ErrorMsg = await formatDMSError('execSetup', results.stderr);
      errorLog(ErrorMsg);
      return {success: false, error:ErrorMsg};
    }

    return {success: true, message: aliases};
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }
};


export const parseAliasesFromDMS = async stdout => {
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
};


export const pullPostfixRegexFromDMS = async containerName => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};

  let regexes = [];
  const command = `cat ${env.DMS_CONFIG_PATH}/postfix-regexp.cf`;
  
  try {
    const targetDict = getTargetDict('mailserver', containerName);

    debugLog(`execSetup(${command})`);
    const results = await execCommand(command, targetDict);
    if (!results.returncode) {
      
      regexes = await parsePostfixRegexFromDMS(results.stdout);
      infoLog(`Found ${regexes.length} regexes`);
    
    } else {
      let ErrorMsg = await formatDMSError('execSetup', results.stderr);
      errorLog(ErrorMsg);
      return {success: false, error: ErrorMsg};
    }
    return {success: true, message: regexes};
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }
};


export const parsePostfixRegexFromDMS = async stdout => {
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
};


// Function to add an alias
export const addAlias = async (containerName, source, destination) => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};

  let results, result;
  try {
    const targetDict = getTargetDict('mailserver', containerName);

    if (source.match(regexEmailStrict)) {
      debugLog(`Adding new alias: ${source} -> ${destination}`);
    
      results = await execSetup(`alias add ${source} ${destination}`, targetDict);
      if (!results.returncode) {
        
        result = dbRun(sql.aliases.insert.alias, {source:source, destination:destination, regex:0}, containerName);
        if (result.success) {
          successLog(`Alias created: ${source} -> ${destination}`);
          return { success: true, message: `Alias created: ${source} -> ${destination}` };
          
        }
        return result;
        
      }
      let ErrorMsg = await formatDMSError('execSetup', results.stderr);
      errorLog(ErrorMsg);
      return { success: false, error: ErrorMsg };
      
    // this is a regex
    } else {
      let command = `echo '${source} ${destination}' >>${env.DMS_CONFIG_PATH}/postfix-regexp.cf`;
      debugLog(`Adding new regex: ${source} -> ${destination}`);
      
      results = await execCommand(command, targetDict);
      if (!results.returncode) {
        
        // reload postfix
        command = `postfix reload`;
        results = await execCommand(command, targetDict);
        if (!results.returncode) {
          
          result = dbRun(sql.aliases.insert.alias, {source:JSON.stringify(source), destination:destination, regex:1}, containerName);
          if (result.success) {
            successLog(`Alias regex created: ${source} -> ${destination}`);
            return { success: true, message: `Alias regex created: ${source} -> ${destination}` };
            
          }
          return result;
          
        }
        errorLog(results.stderr);
        return { success: false, error: results.stderr };
        
      }
      errorLog(results.stderr);
      return { success: false, error: results.stderr };
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

// Function to delete an alias
export const deleteAlias = async (containerName, source, destination) => {
  if (!containerName) return {success: false, error: 'containerName has not been defined yet'};

  let results, result;
  try {
    const targetDict = getTargetDict('mailserver', containerName);

    // this is normal email format
    if (source.match(regexEmailStrict)) {
      debugLog(`Deleting alias: ${source} -> ${destination}`);
      
      results = await execSetup(`alias del ${source} ${destination}`, targetDict);
      debugLog(`------------------------------- Alias deleted results:`, results);
      if (!results.returncode) {
        result = deleteEntry('aliases', source, 'bySource', containerName);
        if (result.success) {
          successLog(`Alias deleted: ${source}`);
          return { success: true, message: `Alias deleted: ${source}` };
          
        }
        return result;
        
      } else {
        let ErrorMsg = await formatDMSError('execSetup', results.stderr);
        errorLog(ErrorMsg);
        return { success: false, error: ErrorMsg };
      }
    
    // this is regex, must stringify
    } else {
      source = JSON.stringify(source);
      debugLog(`Deleting alias regex: ${source}`);
      
      let command = `grep -Fv '${source} ${destination}' ${env.DMS_CONFIG_PATH}/postfix-regexp.cf >/tmp/postfix-regexp.cf && mv /tmp/postfix-regexp.cf ${env.DMS_CONFIG_PATH}/postfix-regexp.cf`;
      results = await execCommand(command, targetDict);
      debugLog(`------------------------------- Alias regex deleted results:`, results);
      if (!results.returncode) {
        successLog(`Alias regex deleted: ${source}`);
        
        const result = deleteEntry('aliases', source, 'bySource', containerName);
        if (result.success) {
          successLog(`Alias entry deleted: ${source}`);

          // reload postfix
          command = `postfix reload`;
          results = await execCommand(command, targetDict);
          if (!results.returncode) {
            
            successLog(`postfix reloaded`);
            return result;
          }
          errorLog(results.stderr);
          return { success: false, error: results.stderr };
          
        } else  return result;
        
      }
      errorLog(results.stderr);
      return { success: false, error: results.stderr };

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


// module.exports = {
//   getAliases,
//   addAlias,
//   deleteAlias,
// };


