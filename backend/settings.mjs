import {
  arrayOfStringToDict,
  getValueFromArrayOfObj,
  jsonFixTrailingCommas,
  obj2ArrayOfObj,
  pluck,
  reduxArrayOfObjByValue,
  reduxPropertiesOfObj,
} from '../common.mjs';
import {
  command,
  env,
  userPatchesAPI,
} from './env.mjs';

import {
  debugLog,
  errorLog,
  execCommand,
  execSetup,
  infoLog,
  ping,
  successLog,
  warnLog,
  writeFile,
} from './backend.mjs';
import {
  processTopData,
} from './topParser.mjs';

import {
  dbAll,
  dbCount,
  dbGet,
  dbRun,
  decrypt,
  encrypt,
  getTargetDict,
  sql,
} from './db.mjs';

// const path = require('node:path');
import * as childProcess from 'child_process';
import path from 'path';

// returns a string
export const getSetting = async (plugin, schema, scope, containerName, name, encrypted=false) => {
  debugLog(plugin, schema, scope, containerName, name, encrypted);
  if (!containerName) return {success: false, error: 'scope=containerName is required'};
  if (!name)          return {success: false, error: 'name is required'};

  try {
    
    // const result = dbGet(sql.settings.select.setting, {scope:containerName}, name);
    // setting:  `SELECT       value from settings s LEFT JOIN config c ON s.configID = c.id WHERE 1=1 AND configID = (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope) AND isMutable = ${env.isMutable}   AND name = ?`,
    const result = dbGet(sql.config.select.setting, {plugin:plugin, schema:schema, scope:scope}, containerName, name); // plugin:'mailserver', schema:'dms', scope:'dms-gui'
    if (result.success) {
      return {success: true, message: (encrypted ? decrypt(result.message?.value) : result.message?.value)}; // success is true also when no result is returned
    }
    return result;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// this returns an array of objects
export const getSettings = async (plugin, schema, scope, containerName, name, encrypted=false) => {
  debugLog(plugin, schema, scope, containerName, name, encrypted);
  if (!containerName)             return {success: false, error: 'scope=containerName is required'};
  if (name) return getSetting(plugin, schema, scope, containerName, name, encrypted);
  
  let result, settings;
  try {
    
    // result = dbAll(sql.settings.select.settings, {scope:containerName});
    // settings: `SELECT name, value from settings s LEFT JOIN config c ON s.configID = c.id WHERE 1=1 AND configID = (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope) AND isMutable = ${env.isMutable}`,
    result = dbAll(sql.config.select.settings, {plugin:plugin, schema:schema, scope:scope}, containerName); // plugin:'mailserver', schema:'dms', scope:'dms-gui'
    if (result.success) {
      
      // we could read DB_Logins and it is valid
      if (result.message.length) {
        infoLog(`Found ${result.message.length} entries in settings`);
        debugLog('settings', result.message)

        // decryption where needed
        settings = result.message.map(setting => { return {
          ...setting,
          value: (encrypted) ? decrypt(setting.value) : setting.value,
          }; 
        }); 

      } else {
        warnLog(`db settings seems empty:`, result.message);
      }
      
    } else errorLog(result?.error);
    
    return result;
    // [ { name: 'containerName', value: 'dms' }, .. ]
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// this returns all configs, and roles are either mailboxes or scopes==userIDs
export const getConfigs = async (plugin, schema, roles=[], name) => {
  debugLog(plugin, schema, roles, name);

  let result;
  try {
    // for admins
    if (!roles || !roles.length) {
      if (schema) {
        result = dbAll(sql.config.select.configs, {plugin:plugin, schema:schema}, "%");
      } else {
        result = dbAll(sql.config.select.configs.replace('AND schema = @schema', ''), {plugin:plugin}, "%");
      }

    // for non-admins, we only provide scoped values
    } else {
      if (plugin == 'mailserver') {
        // if you know of a better way than replacing x number of ?, let me know
        // `SELECT scope as value, 'mailserver' as plugin, schema, 'dms-gui' as scope FROM accounts WHERE mailbox IN (?) AND schema = @schema`,
        result = dbAll(sql.accounts.select.configs.replace("?", Array(roles.length).fill("?").join(",")), roles);
        debugLog(`Accounts for ${roles}:`, result);

      } else {
        // `SELECT DISTINCT config as value from config WHERE 1=1 AND plugin = @plugin AND schema = @schema AND (scope LIKE ?)`
        if (schema) {
          result = dbAll(sql.config.select.configs.replace("scope LIKE ?", Array(roles.length).fill("scope LIKE ?").join(" OR ")), {plugin:plugin, schema:schema}, roles);
        } else {
          result = dbAll(sql.config.select.configs.replace('AND schema = @schema', '').replace("scope LIKE ?", Array(roles.length).fill("scope LIKE ?").join(" OR ")), {plugin:plugin}, roles);
        }
      }
    }

    // debugLog('ddebug result', result);
    if (result.success) {
      if (name) result.message = reduxArrayOfObjByValue(result.message, 'value', name);

      if (result.message.length) {
        infoLog(`Found ${result.message.length} configs for ${plugin}/${schema} scope=`, roles);

      } else {
        warnLog(`Found ${result.message.length} configs for ${plugin}/${schema} scope=`, roles);
      }
      
    } else errorLog(result?.error);
    
    return result;
    // [ { value: 'containerName' }, .. ]
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// jsonArrayOfObjects = [{name:name, value:value}, ..]
// Until we figure a better way or decide to not handle more then one DMS container... 
// ... the value for containerName will always be decided and come from the frontend
// ... the value for DMS_API_KEY   will always be dependent on containerName from the frontend
// ... the value for DMS_API_PORT  will always be dependent on containerName from the frontend
export const saveSettings = async (plugin, schema, scope, containerName, jsonArrayOfObjects, encrypted=false) => {
  debugLog(plugin, schema, scope, containerName, jsonArrayOfObjects, encrypted);
  if (!jsonArrayOfObjects.length) return {success: false, error: 'values=jsonArrayOfObjects is required'};

  let result;
  try {
    
    result = dbGet(sql.config.select.id, {plugin:plugin, schema:schema, scope:scope}, containerName);
    if (!result.message?.id) {
      // config:   `INSERT INTO config (config, plugin, schema, scope) VALUES (?, @plugin, @schema, @scope) RETURNING id`,
      result = dbGet(sql.config.insert.config, {plugin:plugin, schema:schema, scope:scope}, containerName);
      if (!result.success) return result;
    }

    // scope all settings for that container
    const jsonArrayOfObjectsScoped = jsonArrayOfObjects.map(setting => { return {
        ...setting,
        value: (encrypted) ? encrypt(setting.value) : setting.value,
        plugin:plugin,
        schema:schema,
        scope:scope,
      }; 
    });
    
    // setting:  `REPLACE INTO settings (name, value, configID, isMutable) VALUES (@name, @value, (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope), 1)`,
    result = dbRun(sql.config.insert.setting, jsonArrayOfObjectsScoped, containerName); // jsonArrayOfObjects = [{name:name, value:value, scope:scope, ..}, ..]
    if (result.success) {
      successLog(`Saved ${jsonArrayOfObjectsScoped.length} settings for containerName=${containerName}`);

      // now (re) generate API scripts if we are saving a new DMS_API_KEY
      const DMS_API_KEY = getValueFromArrayOfObj(jsonArrayOfObjectsScoped, 'DMS_API_KEY');
      if (DMS_API_KEY) result = await initAPI(plugin, schema, containerName, DMS_API_KEY);
      
    }
    return result;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// Function to get server status from DMS, you can add some extra test like ping or execSetup
export const getServerStatus = async (plugin, schema, containerName, test=undefined, settings=[]) => {
  debugLog(plugin, schema, containerName, test, settings);
  if (!containerName)             return {success: false, error: 'containerName is required'};

  let result, results;
  let status = {
    status: {
      status: 'stopped',
      error: null,
    },
    resources: {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      error: null,
    },
    db: {
      logins: 0,
      accounts: 0,
      aliases: 0,
      error: null,
    },
  };

  // const cpu_Usage    = "top -bn1 | awk '/Cpu/ { print $2}'"
  // const memory_Used  = "free -m | awk '/Mem/ {print $3}'"
  // const memory_Usage = "free -m | awk '/Mem/ {print 100*$3/$2}'"

  const disk_cmd     = "du -sm /var/mail | cut -f1"
  const top_cmd      = "top -bn1 | head -12"
  // top_parser will parse all of the below
  // top - 02:02:32 up 35 days, 22:39,  0 user,  load average: 0.00, 0.01, 0.00
  // Tasks:  35 total,   1 running,  34 sleeping,   0 stopped,   0 zombie
  // %Cpu(s):  0.0 us,100.0 sy,  0.0 ni,  0.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
  // MiB Mem :   4413.7 total,    410.5 free,   1269.0 used,   3088.8 buff/cache
  // MiB Swap:   2304.0 total,   2201.0 free,    103.0 used.   3144.7 avail Mem

      // PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
     // 1946 _mta-sts  20   0  335112  34004  12288 S   6.2   0.8   0:08.83 mta-sts-daemon
        // 1 root      20   0    2332   1024   1024 S   0.0   0.0   0:00.04 dumb-init
        // 7 root      20   0   37260  31280  10240 S   0.0   0.7   0:01.39 supervisord
       // 49 root      20   0    2896   1536   1536 S   0.0   0.0   0:00.55 tail
     // 1899 root      20   0   24716  18048   9088 S   0.0   0.4   0:00.52 python3

  try {
    result = dbCount('logins', containerName);
    if (result.success) status.db.logins = result.message;

    result = dbCount('accounts', containerName, schema);
    if (result.success) status.db.accounts = result.message;

    result = dbCount('aliases', containerName, schema);
    if (result.success) status.db.aliases = result.message;

    result = await ping(containerName);
    if (result.success) {
      status.status.status = "alive";
      if (test == 'ping') return {success: true, message: status};

      const targetDict = getTargetDict(plugin, schema, containerName, settings);
      // debugLog('ddebug targetDict', targetDict);
      if (targetDict?.Authorization) {

        results = await execSetup('help', targetDict);
        if (!results.returncode) {
          status.status.status = "running";

        } else {
          if (results.stderr) {
            if (results.stderr.match(/api_miss/)) status.status.status = "api_miss";   // API key was not sent somehow
            if (results.stderr.match(/api_error/)) status.status.status = "api_error";   // API key is different on either side
            if (results.stderr.match(/api_miss/)) status.status.status = "api_unset";   // API key is not defined in DMS compose
            status.status.error = results.stderr;

          } else {
            status.status.status = 'api_error';
            status.status.error = 'unknown';
          }
          return {success: false, error: status};
        }

        if (test == 'execSetup' && !results.returncode) {
          return {success: true, message: status};
        }

        if (env.isDEMO) {
          return {success: true, message: status};
        }

        const [result_top, result_disk] = await Promise.all([
          execCommand(top_cmd, targetDict),
          execCommand(disk_cmd, targetDict, {timeout: 5}),
        ]);
        
        // debugLog('processTopData', processTopData(result_top.stdout))
        if (!result_top.returncode) {
          const topJson = processTopData(result_top.stdout);
          
          // BUG: uptime is that of the host... to get container uptime in hours: $(( ( $(cut -d' ' -f22 /proc/self/stat) - $(cut -d' ' -f22 /proc/1/stat) ) / 100 / 3600 ))
          // debugLog('processTopData', processTopData(result_top.stdout));
          // {
            // top: {
              // time: '04:16:04',
              // up_days: '36',
              // load_average: [ '0.08', '0.07', '0.02' ]
            // },
            // tasks: {
              // total: '31',
              // running: '1',
              // sleeping: '30',
              // stopped: '0',
              // zombie: '0'
            // },
            // cpu: {
              // us: '0.0',
              // sy: '100.0',
              // ni: '0.0',
              // id: '0.0',
              // wa: '0.0',
              // hi: '0.0',
              // si: '0.0',
              // st: '0.0'
            // },
            // mem: {
              // total: '4413.7',
              // used: '1305.2',
              // free: '272.5',
              // buff_cache: '3134.2'
            // },
          // }
          
          // status.resources.cpuUsage = result_cpu.stdout;
          // status.resources.memoryUsage = result_mem.stdout;
          
          status.resources.cpuUsage = Number(topJson.cpu.us) + Number(topJson.cpu.sy);
          status.resources.memoryUsage = 100 * Number(topJson.mem.used) / Number(topJson.mem.total);
          
        } else {
          errorLog(result_top.stderr);
          status.resources.error = result_top.stderr;     // transmit actual error to frontend
          if (result_top.stderr.match(/api_miss/)) status.status.status = "api_miss";   // API key was not sent somehow
          if (result_top.stderr.match(/api_error/)) status.status.status = "api_error";   // API key is different on either side
          if (result_top.stderr.match(/api_miss/)) status.status.status = "api_unset";   // API key is not defined in DMS compose
        }

        if (!result_disk.returncode) {
          status.resources.diskUsage = Number(result_disk.stdout);
        } else {
          errorLog(result_disk.stderr);
          status.resources.error = result_disk.stderr;    // transmit actual error to frontend
          if (result_top.stderr.match(/api_miss/)) status.status.status = "api_miss";   // API key was not sent somehow
          if (result_top.stderr.match(/api_error/)) status.status.status = "api_error";   // API key is different on either side
          if (result_top.stderr.match(/api_miss/)) status.status.status = "api_unset";   // API key is not defined in DMS compose
        }

      } else if (!targetDict || Object.keys(targetDict).length) {
        status.status.status = "unknown";   // targetDict likely is missing something
        status.status.error = 'Missing elements in targetDict';

      } else {
        status.status.status = "api_gen";   // just API key has not been generated yet
      }
      
    } else {
      status.status.error = result.message;   // transmit actual error to frontend

      if (result?.message && result.message.match(/bad address/)) {
        status.status.status = "missing";   // dns error or container not created
      } else {
        status.status.status = "stopped";
      }
    }

    // remote server being down is not a measure of failure
    return {success: true, message: status};
    
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


/*
// Function to get server status from a docker container - deprecated
async function getServerStatusFromDocker(containerName) {
containerName = (containerName) ? containerName : live.DMS_CONTAINER;
debugLog(`for ${containerName}`);

var status = {
  status: {
    status: 'loading',
    error: undefined,
  },
  resources: {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
  },
};

try {
  
  // Get container info
  let container = getContainer(containerName);
  let containerInfo = await container.inspect();

  // Check if container exist
  status.status.status = (containerInfo.Id) ? "stopped" : "missing";
  
  if ( status.status.status != "missing") {
    
    // Check if container is running
    const isRunning = containerInfo.State.Running === true;
    // debugLog(`Container running: ${isRunning} status.status=`, status.status);

    // get also errors and stuff
    status.status.Error = containerInfo.State.Error;
    status.status.StartedAt = containerInfo.State.StartedAt;
    status.status.FinishedAt = containerInfo.State.FinishedAt;
    status.status.Health = containerInfo.State.Health.Status;

    // pull cpu stats if isRunning
    if (isRunning) {
      status.status.status = 'running';
      
      // Get container stats
      // debugLog(`Getting container stats`);
      const stats = await container.stats({ stream: false });
      // debugLog('stats:',stats);
      
      // Calculate CPU usage percentage
      const cpuDelta =
          stats.cpu_stats.cpu_usage.total_usage
        - stats.precpu_stats.cpu_usage.total_usage;
      const systemCpuDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent =
        (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus;
        // (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus * 100;
      // status.resources.cpuUsage = `${cpuPercent.toFixed(2)}%`;
      status.resources.cpuUsage = cpuPercent;

      // Calculate memory usage
      const memoryUsageBytes = stats.memory_stats.usage;
      // status.resources.memoryUsage = byteSize2HumanSize(memoryUsageBytes);
      status.resources.memoryUsage = memoryUsageBytes;

      // debugLog(`Resources:`, status.resources);

      // For disk usage, we would need to run a command inside the container
      // This could be a more complex operation involving checking specific directories
    }
  }

  // debugLog(`Server pull status result:`, status);
  successLog(`Server pull status`);
  return status;
  
} catch (error) {
  let backendError = `${error.message}`;
  errorLog(`${backendError}`);
  throw new Error(backendError);
  // TODO: we should return smth to theindex API instead of throwing an error
  // return {
    // status: 'unknown',
    // error: error.message,
  // };
}
}
*/


// function readDovecotConfFile will convert dovecot conf file syntax to JSON
export const readDovecotConfFile = async stdout => {
  // what we get: -------------------
  /*
  mail_plugins = $mail_plugins fts fts_xapian
  plugin {
    fts = xapian
    fts_xapian = partial=3 full=20 verbose=0

    fts_autoindex = yes
    fts_enforced = yes
    # https://doc.dovecot.org/2.3/settings/plugin/fts-plugin/#plugin_setting-fts-fts_autoindex_max_recent_msgs
    # fts_autoindex_max_recent_msgs = 999

    # https://doc.dovecot.org/2.3/settings/plugin/fts-plugin/#plugin_setting-fts-fts_autoindex_exclude
    fts_autoindex_exclude = \Trash
    fts_autoindex_exclude2 = \Junk

    # https://doc.dovecot.org/2.3/settings/plugin/fts-plugin/#plugin_setting-fts-fts_decoder
    # fts_decoder = decode2text
  }
  service indexer-worker {
    # limit size of indexer-worker RAM usage, ex: 512MB, 1GB, 2GB
    vsz_limit = 2GB
  }
  */

  // what we want: -------------------
  // plugin: {
    // fts: "xapian",
    // fts_xapian: "partial=3 full=20 verbose=0",
    // fts_autoindex: "yes",
    // fts_enforced: "yes",
    // fts_autoindex_exclude: "\Trash",
    // fts_autoindex_exclude2: "\Junk",
  // }

  // TODO: not capture trailing spaces in a set of words /[\s+]?=[\s+]?([\S\s]+)[\s+]?$/
  const regexConfComments = /^(\s+)?#(.*?)$/;
  // " mail_plugins = $mail_plugins fts fts_xapian ".replace(/(\s+)?(\S+)(\s+)?=(\s+)?([\S\s]+)(\s+)?$/, "'$2': '$5',") -> "'mail_plugins': '$mail_plugins fts fts_xapian ',"
  // const regexConfDeclare = /(\s+)?(\S+)(\s+)?[=:](\s+)?\"?([\S\s]+)\"?(\s+)?$/;
  const regexConfDeclare = /(\s+)?(\S+)[\s]*[=:][\s]*[\"]?([\S\s]+)[\"]?[\s]*$/;      // $3 is greedy and will capture the last quote
  // " ssss indexer-worker { ".replace(/(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/, "'$2': $5") -> " 'ssss': {"
  const regexConfObjOpen = /(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/;
  const regexConfObjClose = /(\s+)?([\]\}])(\s+)?$/;
  const regexEmpty = /^\s*[\r\n]/gm;


  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  const cleanlines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(regexEmpty, '')
                         .replace(regexConfComments, '')
                         .replace(regexConfDeclare, '"$2": "$3",')
                         .replace(/[\"]+/g, '"')
                         .replace(regexConfObjOpen, '"$2": $5')
                         .replace(regexConfObjClose, '$2,')
                         .trim();
    if (line) cleanlines.push(line);
  }

  const cleanData = `{${cleanlines.join('\n')}}`;
  // debugLog(`cleanData:`, cleanData);

  try {
    const json = jsonFixTrailingCommas(cleanData, true);
    // debugLog(`json:`, json);
    return json;
  } catch (error) {
    errorLog(`cleanData not valid JSON:`, error.message);
    return {};
  }
};


// function readDkimFile will convert dkim conf file syntax to JSON
export const readDkimFile = async stdout => {
  // what we get: -------------------
  /*
  enabled = true;

  # If false, messages from authenticated users are not selected for signing
  sign_authenticated = true;
  # If false, inbound messages are not selected for signing
  sign_inbound = true;

  # If false, messages from local networks are not selected for signing
  sign_local = true;
  # Whether to fallback to global config
  try_fallback = false;

  # Domain to use for ARC signing: can be "header" (MIME From), "envelope" (SMTP From), "recipient" (SMTP To), "auth" (SMTP username) or directly specified domain name
  use_domain = "header";
  # don't change unless Redis also provides the DKIM keys
  use_redis = false;
  # Whether to normalise domains to eSLD: sub.domain.com becomes domain.com as discussed here https://github.com/docker-mailserver/docker-mailserver/issues/3778
  use_esld = true;
  # If true, username does not need to contain matching domain
  allow_username_mismatch = true;

  # you want to use this in the beginning
  check_pubkey = true;

  # global DKIM-selector: this is critical and must match a TXT entry called selector._domainkey in ALL of your domains
  # DKIM Rotation example with minimal downtime (due to restart of dms):
  # 0. alias dmss='docker exec -it dms setup'
  # 1. generate new keys with new selector: dmss config dkim domain ${domain} selector new_selector keytype ${keytype} keysize ${keysize}
  # 2. create new TXT entries 'new_selector._domainkey' with the content of the generated *-public.dns.txt keys
  # 3. modify the selector name below and restart dms:
  selector = "dkim";

  # The path location is searched for a DKIM key with these variables:
  # - $domain is sourced from the MIME mail message From header
  # - $selector is configured for mail (as a default fallback)
  # Update the keytype=rsa and keysize=2048 to the values you use for your keys
  path = "/tmp/docker-mailserver/rspamd/dkim/rsa-2048-$selector-$domain.private.txt";
  
  # domain specific configurations can be provided below:
  domain {
      domain.com {
          path = "/tmp/docker-mailserver/rspamd/dkim/rsa-2048-dkim-domain.com.private.txt";
          selector = "dkim";
      }
      ..
  }
  */

  // what we want: -------------------
  // dkim: {
    // enabled: "true",
    // selector: "dkim",
    // path: "/tmp/docker-mailserver/rspamd/dkim/rsa-2048-$selector-$domain.private.txt",
    // domain: {
      // domain.com: {
        // path: "/tmp/docker-mailserver/rspamd/dkim/rsa-2048-dkim-domain.com.private.txt",
        // selector: "dkim"
      // },
      // ..
    // }
  // }

  // TODO: not capture trailing spaces in a set of words /[\s+]?=[\s+]?([\S\s]+)[\s+]?$/
  const regexConfComments = /^(\s+)?#(.*?)$/;
  // " mail_plugins = $mail_plugins fts fts_xapian ".replace(/(\s+)?(\S+)(\s+)?=(\s+)?([\S\s]+)(\s+)?$/, "'$2': '$5',") -> "'mail_plugins': '$mail_plugins fts fts_xapian ',"
  const regexConfDeclare = /(\s+)?(\S+)(\s+)?=(\s+)?([\S\s]+)(\s+)?$/;
  // " ssss indexer-worker { ".replace(/(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/, "'$2': $5") -> " 'ssss': {"
  const regexConfObjOpen = /(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/;
  const regexConfObjClose = /(\s+)?([\]\}])(\s+)?$/;
  const regexEmpty = /^\s*[\r\n]/gm;
  const regexRemoveQuotesColon = /[\";]/g;


  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  const cleanlines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(regexEmpty, '')
                         .replace(regexRemoveQuotesColon, '')
                         .replace(regexConfComments, '')
                         .replace(regexConfDeclare, '"$2": "$5",')
                         .replace(regexConfObjOpen, '"$2": $5')
                         .replace(regexConfObjClose, '$2,')
                         .trim();
    if (line) cleanlines.push(line);
  }


// BUG:
// domain {
  // domain.com {
      // path = "/tmp/docker-mailserver/rspamd/dkim/rsa-2048-dkim-domain.com.private.txt";
      // selector = "dkim";
  // }
  // ..

// becomes
// "domain": {
// "domain.com": {
// "path": ""/tmp/docker-mailserver/rspamd/dkim/rsa-2048-dkim-domain.com.private.txt";",
// "selector": ""dkim";",
// },
// ..



  const cleanData = `{${cleanlines.join('\n')}}`;
  // debugLog(`cleanData:`, cleanData);

  try {
    const json = jsonFixTrailingCommas(cleanData, true);
    debugLog(`json:`, json);
    return json;
    
  } catch (error) {
    errorLog(`cleanData not valid JSON:`, error.message);
    return {};
  }
};


// pulls entire doveconf and parse what we need
export const pullDoveConf = async (schema, containerName) => {

// TODO: add quotas
// "quota_max_mail_size": "314M",
// "quota_rule": "*:storage=5242M",

  debugLog(`start`);
  let envs = {};

  try {
    const targetDict = getTargetDict('mailserver', schema, containerName);
    const command = `doveconf`;

    const results = await execCommand(command, targetDict);
    if (!results.returncode) {
      const doveconf = await readDovecotConfFile(results.stdout);
      // debugLog(`doveconf:`, doveconf);   // super large output, beware
      
      if (doveconf?.plugin?.fts) {
        envs.DOVECOT_FTS_PLUGIN = doveconf.plugin.fts;
        envs.DOVECOT_FTS_AUTOINDEX = doveconf.plugin.fts_autoindex;
      }

      if (doveconf?.mail_plugins) {
        // [ "mail_plugins", "quota", "fts", "fts_xapian", "zlib" ]
        // the bellow will add those items: envs.DOVECOT_QUOTA, DOVECOT_FTS, DOVECOT_FTP_XAPIAN, DOVECOT_ZLIB etc
        for (const PLUGIN of doveconf.mail_plugins.split(' ')) {
          if (PLUGIN) envs[`DOVECOT_${PLUGIN.toUpperCase()}`] = 1;
        }
      }

    } else errorLog(results.stderr);
    
  } catch (error) {
    errorLog(`execCommand failed with error:`, error.message);
  }
  return envs;
};


/*
// pulls FTS info from detecting fts named mounts in docker - deprecated
async function pullFTSFromDocker(containerName, containerInfo) {
let ftsMount = '';
let envs = {};

try {
  const targetDict = getTargetDict(plugin, schema, containerName);

  containerInfo.Mounts.forEach( async (mount) => {
    debugLog(`found mount ${mount.Destination}`);
    if (mount.Destination.match(/fts.*\.conf$/i)) {
      // we get the DMS internal mount as we cannot say if we have access to that file on the host system
      ftsMount = mount.Destination;
    }
  });

  // if we found fts override plugin, let's load it
  if (ftsMount) {
    const results = await execCommand(`cat ${ftsMount}`, targetDict);
    if (!results.returncode) {
      debugLog(`dovecot file content:`, results.stdout);
      const ftsConfig = await readDovecotConfFile(results.stdout);
      debugLog(`dovecot json:`, ftsConfig);
      
      if (ftsConfig?.plugin?.fts) {
        envs.DOVECOT_FTS_PLUGIN = ftsConfig.plugin.fts;
        envs.DOVECOT_FTS_AUTOINDEX = ftsConfig.plugin.fts_autoindex;

      }
    } else errorLog(results.stderr);
  
  }
  
} catch (error) {
  errorLog(`execCommand failed with error:`,error);
}
return envs;
}
*/


export const pullDOVECOT = async (schema, containerName) => {
  let envs = {};

  try {
    const targetDict = getTargetDict('mailserver', schema, containerName);
    const command = `dovecot --version`;

    const results = await execCommand(command, targetDict);   // 2.3.19.1 (9b53102964)
    if (!results.returncode) {
      const DOVECOT_VERSION = results.stdout.split(" ")[0];
      debugLog(`DOVECOT_VERSION:`, DOVECOT_VERSION);
      
      envs.DOVECOT_VERSION = DOVECOT_VERSION;

    } else errorLog(results.stderr);
    
  } catch (error) {
    errorLog(`execCommand failed with error:`, error.message);
  }
  return envs;
};


/*
// deprecated
async function pullMailPluginsOLD(containerName) {
debugLog(`start`);
let envs = {};

try {
  const targetDict = getTargetDict(plugin, schema, containerName);

  const results = await execCommand(`doveconf mail_plugins`, targetDict);   // results.stdout = "mail_plugins = quota fts fts_xapian zlib"
  if (!results.returncode) {
    // [ "mail_plugins", "quota", "fts", "fts_xapian", "zlib" ]
    // the bellow will add those items: envs.DOVECOT_QUOTA, DOVECOT_FTS, DOVECOT_FTP_XAPIAN and DOVECOT_ZLIB
    for (const PLUGIN of results.stdout.split(/[=\s]+/)) {
      if (PLUGIN && PLUGIN.toUpperCase() != 'MAIL_PLUGINS') envs[`DOVECOT_${PLUGIN.toUpperCase()}`] = 1;
    }

  } else errorLog(results.stderr);

} catch (error) {
  errorLog(`execCommand failed with error:`,error);
}
return envs;
}
*/


export const pullDkimRspamd = async (schema, containerName) => {

  // we pull only if ENABLE_RSPAMD=1 because we don't know what the openDKIM config looks like
  let envs = {};
  let results, dkimConfig;
  const command = `cat ${env.DMS_CONFIG_PATH}/rspamd/override.d/dkim_signing.conf`;

  try {
    const targetDict = getTargetDict('mailserver', schema, containerName);

    results = await execCommand(command, targetDict);
    if (!results.returncode) {
      debugLog(`dkim file content:`, results.stdout);
      dkimConfig = await readDkimFile(results.stdout);
      debugLog(`dkim json:`, dkimConfig);
      
      envs.DKIM_ENABLED   = dkimConfig?.enabled;
      envs.DKIM_SELECTOR  = dkimConfig?.selector || env.DKIM_SELECTOR_DEFAULT;
      envs.DKIM_PATH      = dkimConfig?.path;

      if (dkimConfig?.domain) {
        for (const [domain, item] of Object.entries(dkimConfig.domain)) {
          let split, [keytype, keysize] = ['', ''];
          if (item?.path) {
            split = path.basename(item.path).split('-');  // [ 'rsa', '2048', 'dkim', '$domain.private.txt' ]
            keytype = split[0];
            keysize = split[1];
          }
          if (item?.selector) {
            results = dbRun(sql.domains.insert.domain, {domain:domain, dkim:item?.selector, keytype:keytype, keysize:keysize, path:(item?.path || envs.DKIM_PATH),scope:containerName});
          }
        }
      }

    } else warnLog(results.stderr);  // dkim is optional, not an error if absent


  } catch (error) {
    errorLog(`execCommand failed with error:`, error.message);
  }
  return envs;
};


// Function to pull server environment from API
export const pullServerEnvs = async (plugin, schema, containerName) => {

  var envs = {DKIM_SELECTOR_DEFAULT: env.DKIM_SELECTOR_DEFAULT };
  try {
    const targetDict = getTargetDict(plugin, schema, containerName);
    const command = `env`;

    // Get container instance
    const result_env = await execCommand(command, targetDict);
    if (!result_env.returncode) {

      // get and conver DMS environment to dict ------------------------------------------ envs
      const dictEnvDMS = arrayOfStringToDict(result_env.stdout, '=');
      // debugLog(`dictEnvDMS`, dictEnvDMS);
      
      // we keep only some options not all
      const dictEnvDMSredux = reduxPropertiesOfObj(dictEnvDMS, env.DMS_OPTIONS);
      // debugLog(`dictEnvDMSredux:`, dictEnvDMSredux);


      // look for dovecot version -------------------------------------------------- dovecot version
      const dovecot = await pullDOVECOT(containerName);

      // look for doveconf mail_plugins fts etc -------------------------------------------------- doveconf
      const doveconf = await pullDoveConf(containerName);
      
      // TODO: look for quotas -------------------------------------------------- quota
      
      // pull dkim conf ------------------------------------------------------------------ dkim rspamd
      const dkim = await pullDkimRspamd(containerName);
      
      // merge all ------------------------------------------------------------------ merge
      envs = { ...envs, ...dictEnvDMSredux, ...dovecot, ...doveconf, ...dkim };
      debugLog(`Server pull envs result:`, envs);
        // DKIM_SELECTOR_DEFAULT: 'mail',
        // ENABLE_MTA_STS: 1,
        // ENABLE_RSPAMD: 1,
        // DMS_RELEASE: 'v15.1.0',
        // PERMIT_DOCKER: 'none',
        // DOVECOT_MAILBOX_FORMAT: 'maildir',
        // POSTFIX_MAILBOX_SIZE_LIMIT: 5242880000,
        // TZ: 'UTC',
        // DOVECOT_VERSION: '2.3.19.1',
        // DOVECOT_FTS_PLUGIN: 'xapian',
        // DOVECOT_FTS_AUTOINDEX: 'yes',
        // DOVECOT_QUOTA: 1,
        // DOVECOT_FTS: 1,
        // DOVECOT_FTS_XAPIAN: 1,
        // DOVECOT_ZLIB: 1,
        // DKIM_ENABLED: 'true',
        // DKIM_SELECTOR: 'dkim',
        // DKIM_PATH: '/tmp/docker-mailserver/rspamd/dkim/rsa-2048-$selector-$domain.private.txt'
      
    } else {
      throw new Error(result_env.stderr);
    }
    
    return obj2ArrayOfObj(envs, true);
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }
  
};

/*
// Function to pull server environment - deprecated
async function pullServerEnvsFromDocker(containerName) {
containerName = (containerName) ? containerName : live.DMS_CONTAINER;
debugLog(`for ${containerName}`);

var envs = {DKIM_SELECTOR_DEFAULT: env.DKIM_SELECTOR_DEFAULT };
try {
  
  // Get container instance
  let container = getContainer(containerName);
  let containerInfo = await container.inspect();

  if (containerInfo.Id) {
    
    debugLog(`containerInfo found, Id=`, containerInfo.Id);
    
    // get and conver DMS environment to dict ------------------------------------------ envs
    dictEnvDMS = await arrayOfStringToDict(containerInfo.Config?.Env, '=');
    // debugLog(`dictEnvDMS:`,dictEnvDMS);
    
    // we keep only some options not all
    dictEnvDMSredux = reduxPropertiesOfObj(dictEnvDMS, env.DMS_OPTIONS);
    debugLog(`dictEnvDMSredux:`, dictEnvDMSredux);


    // look for dovecot mail_plugins -------------------------------------------------- mail_plugins
    let mail_plugins = await pullMailPlugins(containerName);
    
    // TODO: look for quotas -------------------------------------------------- quota
    
    // look for dovecot version -------------------------------------------------- dovecot
    let dovecot = await pullDOVECOT(containerName);

    // look for FTS values -------------------------------------------------- fts
    let fts = await pullFTSFromDocker(containerName, containerInfo);

    // pull dkim conf ------------------------------------------------------------------ dkim rspamd
    let dkim = await pullDkimRspamd(containerName);
    
    // merge all ------------------------------------------------------------------ merge
    envs = { ...envs, ...dictEnvDMSredux, ...mail_plugins, ...dovecot, ...fts, ...dkim };

  }
  
  debugLog(`Server pull envs result:`, envs);
  return obj2ArrayOfObj(envs, true);
  
} catch (error) {
  let backendError = `${error.message}`;
  errorLog(`${backendError}`);
  throw new Error(backendError);
}
}
*/

export const getServerEnv = async (plugin, schema, scope, containerName, name) => {
  debugLog(plugin, schema, scope, containerName, name);
  if (!containerName)             return {success: false, error: 'containerName is required'};
  if (!name)                      return {success: false, error: 'name is required'};
  
  try {

    // const env = dbGet(sql.settings.select.env, {scope:containerName}, name);
    // env:      `SELECT       value from settings s LEFT JOIN config c ON s.configID = c.id WHERE 1=1 AND configID = (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope) AND isMutable = ${env.isImmutable} AND name = ?`,
    const env = dbGet(sql.config.select.env, {plugin:plugin, schema:schema, scope:scope}, containerName, name);
    return {success: true, message: env?.value};
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


export const getServerEnvs = async (plugin, schema, scope, containerName, refresh, name) => {
  debugLog(plugin, schema, scope, containerName, refresh, name);
  if (!containerName)             return {success: false, error: 'containerName is required'};
  refresh = (refresh === undefined) ? true : (env.isDEMO ? false : refresh);
  
  if (!refresh) {
    if (name) return getServerEnv(plugin, schema, scope, containerName, name);
    
    debugLog(`refresh=${refresh} for ${containerName}`);
    try {
      
      // const result = dbAll(sql.settings.select.envs, {scope:containerName});
      // envs:     `SELECT name, value from settings s LEFT JOIN config c ON s.configID = c.id WHERE 1=1 AND configID = (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope) AND isMutable = ${env.isImmutable}`,
      const result = dbAll(sql.config.select.envs, {plugin:plugin, schema:schema, scope:scope}, containerName);
      if (result.success) {
        const envs = result.message;
        debugLog(`envs: (${typeof envs})`, envs);
        
        // we could read DB_Logins and it is valid
        if (envs.length) {
          infoLog(`Found ${envs.length} entries in envs`);
          // {success:true, message: [ { name: 'DOVECOT_FTS_PLUGIN', value: 'xapian' }, .. ] }
          
        } else {
          warnLog(`db settings[env] seems empty:`, envs);
        }
        
      }
      return result;
      
    } catch (error) {
      errorLog(error.message);
      throw new Error(error.message);
      // TODO: we should return smth to the index API instead of throwing an error
      // return {
        // status: 'unknown',
        // error: error.message,
      // };
    }
  }
  
  // now refreshing by pulling data from DMS
  debugLog(`will pullServerEnvs for ${containerName}`);
  const pulledEnv = await pullServerEnvs(plugin, schema, containerName);
  infoLog(`got ${Object.keys(pulledEnv).length} pulledEnv from pullServerEnvs(${containerName})`, pulledEnv);
  
  if (pulledEnv && pulledEnv.length) {
    saveServerEnvs(plugin, schema, scope, containerName, pulledEnv);
    return (name) ? await getServerEnv(containerName, name) : {success: true, message: pulledEnv};
    
  // unknown error
  } else {
    errorLog(`pullServerEnvs could not pull environment from ${containerName}`);
    return {success: false, error: `pullServerEnvs could not pull environment from ${containerName}`};
  }
};


export const saveServerEnvs = async (plugin, schema, scope, containerName, jsonArrayOfObjects) => {  // jsonArrayOfObjects = [{name:name, value:value}, ..]
  debugLog(plugin, schema, scope, containerName, jsonArrayOfObjects);
  if (!containerName)             return {success: false, error: 'scope=containerName is required'};
  if (!jsonArrayOfObjects.length) return {success: false, error: 'values=jsonArrayOfObjects is required'};

  let result;
  try {
    // const jsonArrayOfObjectsScoped = jsonArrayOfObjects.map(env => { return { ...env, scope:containerName }; });
    const jsonArrayOfObjectsScoped = jsonArrayOfObjects.map(env => { return { ...env, plugin:plugin, schema:schema, scope:scope }; });
    // result = dbRun(sql.settings.delete.envs, {scope:containerName});
    // envs:     `DELETE from settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND configID = (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope)`,
    result = dbRun(sql.config.delete.envs, {plugin:plugin, schema:schema, scope:scope}, containerName);
    if (result.success) {
      // result = dbRun(sql.settings.insert.env, jsonArrayOfObjectsScoped); // jsonArrayOfObjectsScoped = [{name:name, value:value, scope:containerName}, ..]  
      // env:      `REPLACE INTO settings (name, value, configID, isMutable) VALUES (@name, @value, (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope), 0)`,
      result = dbRun(sql.config.insert.env, jsonArrayOfObjectsScoped, containerName); // jsonArrayOfObjectsScoped = [{name:name, value:value, plugin:'mailserver', schema:'dmsEnv', scope:containerName}, ..]  
    }
    return result;

  } catch (error) {
    errorLog(error.message);
    return {success: false, error: error.message};
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// Function to get dms-gui server infos
export const getNodeInfos = async () => {
  return {success: true, message: [
    { name: 'debug', value: env.debug },
    { name: 'DMSGUI_VERSION', value: env.DMSGUI_VERSION },
    { name: 'HOSTNAME', value: env.HOSTNAME },
    { name: 'TZ', value: env.TZ },
    { name: 'NODE_VERSION', value: process.version },
    { name: 'NODE_ENV', value: env.NODE_ENV },
    { name: 'PORT_NODEJS', value: env.PORT_NODEJS },
  ]};
};


export const getDomain = async (containerName, name) => {
  debugLog(containerName, name);
  if (!containerName)             return {success: false, error: 'scope=containerName is required'};
  if (!name)                      return {success: false, error: 'name is required'};

  try {
    
    const domain = dbGet(sql.domains.select.domain, {scope:containerName}, name);
    return {success: true, message: domain};
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


export const getDomains = async (containerName, name) => {
  debugLog(containerName, name);
  if (!containerName)             return {success: false, error: 'scope=containerName is required'};
  if (name) return getDomain(containerName, name);
  
  try {
    
    const domains = dbAll(sql.domains.select.domains, {scope:containerName});
    if (domains.success) {
      debugLog(`domains: domains (${typeof domains.message})`);
      
      // we could read DB_Logins and it is valid
      if (domains.message && domains.message.length) {
        infoLog(`Found ${domains.message.length} entries in domains`);
        // {success: true, [ { name: 'containerName', value: 'dms' }, .. ] }
        
      } else {
        warnLog(`db domains seems empty:`, domains.message);
      }
    }
    return domains;
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// Creates API script and conf file for DMS
// 1. if    dms_api_key_param, use it and replace value in db 
// 2. if no dms_api_key_param, use what's in db
// 3. if no dms_api_key_param and nothing in db, generate it
// 4. if    dms_api_key_param == 'regen', regenerate it and save in db
// 5. always create script and conf file at the end
export const initAPI = async (plugin, schema, containerName, dms_api_key_param) => {
  debugLog(plugin, schema, containerName, dms_api_key_param);
  if (!containerName)             return {success: false, error: 'containerName is required'};

  debugLog(`(plugin:${plugin}, schema:${schema}, containerName:${containerName}, dms_api_key_param:${dms_api_key_param})`);
  
  let result, dms_api_key_db, dms_api_key_new;
  try {
    
    // get what key is in db
    // result = await getSetting('dms', containerName, 'DMS_API_KEY');
    result = await getSetting(plugin, schema, 'dms-gui', containerName);
    if (result.success) dms_api_key_db = result.message;
    debugLog(`dms_api_key_db=`, dms_api_key_db);

    // replace key when key is passed
    if (dms_api_key_param) {

      // regen is passed
      if (dms_api_key_param == 'regen') {
        dms_api_key_new = containerName + "-" + crypto.randomUUID();
        debugLog(`dms_api_key_new=regen`, dms_api_key_new);

      // use key vparam passed
      } else {
        dms_api_key_new = dms_api_key_param;
        debugLog(`dms_api_key_new=param`, dms_api_key_new);
      }
    }

    // nothing passed
    if (!dms_api_key_new) {

      // but key exist in db
      if (dms_api_key_db) {
        dms_api_key_new = dms_api_key_db;
        debugLog(`regen dms_api_key_new=dms_api_key_db`, dms_api_key_new);

      // and key is not in db: generate
      } else {
        dms_api_key_new = containerName + "-" + crypto.randomUUID();
        debugLog(`generate dms_api_key_new=`, dms_api_key_new);
      }
    }

    // save key in db
    if (dms_api_key_new != dms_api_key_db) {
      debugLog(`Saving DMS_API_KEY=`, dms_api_key_new);
      // result = dbRun(sql.settings.insert.setting, {name:'DMS_API_KEY', value:dms_api_key_new, scope:containerName});
      // setting:  `REPLACE INTO settings (name, value, configID, isMutable) VALUES (@name, @value, (select id from config WHERE config = ? AND plugin = @plugin AND schema = @schema AND scope = @scope), 1)`,
      result = dbRun(sql.config.insert.setting, {plugin:plugin, schema:schema, scope:'dms-gui', name:'DMS_API_KEY', value:dms_api_key_new}, containerName);
      if (!result.success) return {success: true, message: dms_api_key_new, error: result?.error}; // this error should only happen when testing new dms before it is saved
    }

    // regen API files
    debugLog(`Regenerate API scripts for ${containerName}...`);
    result = await createAPIfiles();
    if (result.success) return {success: true, message: dms_api_key_new};
    
    return {success: false, error: result?.error};

  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
    // TODO: we should return smth to the index API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// TODO: add containerName somewhere in path or file name
export const createAPIfiles = async () => {
  if (env.isDEMO) return {success: true, message: 'API files created'};

  try {
    for (const file of Object.values(userPatchesAPI)) {
      writeFile(file.path, file.content);
      debugLog('created file.path:',file.path)
    }
    return {success: true, message: 'API files created'};
    
  } catch (error) {
    errorLog(error.message);
    return {success: false, error: error.message};
  }
};


export const killContainer = async (plugin='dms-gui', schema='dms-gui', containerName='dms-gui', errorcode=0) => {
  if (env.isDEMO && containerName == 'dms-gui') {
    childProcess.exec(`cp ${env.DATABASE_SAMPLE} ${DATABASE_SAMPLE_LIVE}`, (error, stdout, stderr) => {
      if (error) {
        errorLog(`exec error: ${error}`);
        return;
      }
    });
    successLog(`--------------------------- RESET ${containerName} DATABASE ---------------------------`);
  }
  
  let result;
  warnLog(`--------------------------- REBOOT ${containerName} NOW ---------------------------`);
  if (!env.isDEMO) {
    if (containerName == 'dms-gui') {
      childProcess.exec(command[plugin][schema].kill, (error, stdout, stderr) => {
        if (error) {
          errorLog(`exec error: ${error}`);
          return;
        }
      });
      return {success: true, message: "reboot initiated"};

    // reboot another container; first we check if it exists then do it
    } else {
    
      result = getConfigs(plugin, schema);
      if (result.success) {
        let containerNames = pluck(result.message, 'value');
        if (containerNames.includes(containerName) && command[plugin][schema]?.kill) {

          const targetDict = getTargetDict(plugin, schema, containerName);
          results = await execCommand(command[plugin][schema].kill, targetDict);
          if (results.returncode) return {success: false, error: results.stderr};

        } else return {success: false, error: `kill command missing for ${plugin} schema=${schema}`};
      }
      return {success: false, error: `container ${containerName} not found`};
    }

  }
  return {success: true, message: "reboot initiated"};  // fails silently in all other cases
  
};



// module.exports = {
//   getServerStatus,
//   getNodeInfos,
//   getServerEnv,
//   getServerEnvs,
//   saveServerEnvs,
//   getSetting,
//   getSettings,
//   saveSettings,
//   initAPI,
// };
