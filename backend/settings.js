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
  reduxPropertiesOfObj,
  arrayOfStringToDict,
  obj2ArrayOfObj,
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

// const fs = require("fs");
// const fsp = fs.promises;
// const crypto = require('node:crypto');



const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// const regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;



async function getSetting(name) {
  try {
    
    const setting = await dbGet(sql.settings.select.setting, [name]);
    return ('value' in setting) ? setting.value : undefined;
    
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


async function getSettings(name='') {
  if (name) return getSetting(name);
  
  try {
    
    const settings = await dbAll(sql.settings.select.settings);
    debugLog(`settings: settings (${typeof settings})`);
    
    // we could read DB_Logins and it is valid
    if (settings && settings.length) {
      debugLog(`Found ${settings.length} entries in settings`);
      return settings;
      // [ { name: 'containerName', value: 'dms' }, .. ]
      
    } else {
      debugLog(`settings in db seems empty:`, JSON.stringify(settings));
      return [];
    }
    
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


// async function saveSettings(username, password, email='') {
async function saveSettings(jsonArrayOfObjects) {
  try {
    dbRun(sql.settings.insert.setting, jsonArrayOfObjects); // jsonArrayOfObjects = [{name:name, value:value}, ..]
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


// deprecated
async function getSettingsJson() {
  var DBdict = {};
  var settings = {};
  debugLog(`start`);
  
  try {
    
    debugLog(`calling DBdict readJson(${DB_Settings})`);
    DBdict = await readJson(DB_Settings);
    debugLog(`DBdict:`, DBdict);
    
    // we could read DB_Settings and it is valid
    if (DBdict.constructor == Object && 'settings' in DBdict) {
      debugLog(`Found ${Object.keys(DBdict['settings']).length} settings in DB_Settings`);
      return DBdict['settings'];
      
    // we could not read DB_Settings or it is invalid
    } else {
      infoLog(`${arguments.callee.name}: ${DB_Settings} is empty`);
    }
    
    return settings;
    
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


// deprecated
async function saveSettingsJson(containerName, setupPath=SETUP_SCRIPT, dnsProvider='') {
  DBdict = {
    settings: {
      containerName: containerName,
      setupPath: setupPath,
      dnsProvider: dnsProvider,
    }
  };
  
  try {
    debugLog(`saveSettings: Saving settings:`, DBdict.settings);
    await writeJson(DB_Settings, DBdict);
    return { success: true };
    
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


// Function to get server status
async function getServerStatus() {
  var DBdict = {};
  var status = {
    status: {
      status: 'stopped',
      Error: '',
      StartedAt: '',
      FinishedAt: '',
      Health: '',
    },
    resources: {
      cpu: '0%',
      memory: '0MB',
      disk: '0%',
    },
  };

  try {
    debugLog(`Pulling server status`);
    
    // Get container info
    const container = docker.getContainer(DMS_CONTAINER);
    const containerInfo = await container.inspect();

    // Check if container exist
    status.status.status = (containerInfo.Id) ? "stopped" : "missing";
    
    if ( status.status.status != "missing") {
      
      // Check if container is running
      const isRunning = containerInfo.State.Running === true;
      debugLog(`Container running: ${isRunning} status.status=`, JSON.stringify(status.status));

      // get also errors and stuff
      status.status.Error = containerInfo.State.Error;
      status.status.StartedAt = containerInfo.State.StartedAt;
      status.status.FinishedAt = containerInfo.State.FinishedAt;
      status.status.Health = containerInfo.State.Health.Status;

      // pull cpu stats if isRunning
      if (isRunning) {
        status.status.status = 'running';
        
        // Get container stats
        debugLog(`Getting container stats`);
        const stats = await container.stats({ stream: false });
        
        // Calculate CPU usage percentage
        const cpuDelta =
            stats.cpu_stats.cpu_usage.total_usage
          - stats.precpu_stats.cpu_usage.total_usage;
        const systemCpuDelta =
          stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuPercent =
          (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus * 100;
        status.resources.cpuUsage = `${cpuPercent.toFixed(2)}%`;

        // Calculate memory usage
        const memoryUsageBytes = stats.memory_stats.usage;
        status.resources.memoryUsage = formatMemorySize(memoryUsageBytes);

        debugLog(`Resources:`, JSON.stringify(status.resources));

        // For disk usage, we would need to run a command inside the container
        // This could be a more complex operation involving checking specific directories
        // For simplicity, we'll set this to "N/A" or implement a basic check
        status.resources.diskUsage = 'N/A';
      }
    }

    debugLog(`Server pull status result:`, JSON.stringify(status));
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


// function readDovecotConfFile will convert dovecot conf file syntax to JSON
async function readDovecotConfFile(stdout) {
  // what we get
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

  // what we want
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
  const regexConfDeclare = /(\s+)?(\S+)(\s+)?=(\s+)?([\S\s]+)(\s+)?$/;
  // " ssss indexer-worker { ".replace(/(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/, "'$2': $5") -> " 'ssss': {"
  const regexConfObjOpen = /(\s+)?([\S]+)?([\s\S\-]*)?[\-]?([\S]+)?([\[\{])(\s+)?$/;
  const regexConfObjClose = /(\s+)?([\]\}])(\s+)?$/;
  const regexEmpty = /^\s*[\r\n]/gm;


  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  const cleanlines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(regexEmpty, '')
                         .replace(regexConfComments, '')
                         .replace(regexConfDeclare, '"$2": "$5",')
                         .replace(regexConfObjOpen, '"$2": $5')
                         .replace(regexConfObjClose, '$2,')
                         .trim();
    if (line) cleanlines.push(line);
  }

  const cleanData = `{${cleanlines.join('\n')}}`;
  debugLog(`cleanData:`, cleanData);

  try {
    const json = jsonFixTrailingCommas(cleanData, true);
    debugLog(`json:`, JSON.stringify(json));
    return json;
  } catch (error) {
    errorLog(`cleanData not valid JSON:`, error);
    return {};
  }
}


// Function to pull server environment
async function pullServerEnv() {
  var DBdict = {};
  var envs = {FTS_PLUGIN: "none", FTS_AUTOINDEX: 'no'};

  try {
    debugLog(`Pulling server env`);
    
    // Get container info
    const container = docker.getContainer(DMS_CONTAINER);
    const containerInfo = await container.inspect();

    if (containerInfo.Id) {
      debugLog(`containerInfo found, Id=`, containerInfo.Id);
      
      // get and conver DMS environment to dict
      dictEnvDMS = arrayOfStringToDict(containerInfo.Config.Env, '=');
      // debugLog(`dictEnvDMS:`,dictEnvDMS);
      
      // we keep only some options not all
      dictEnvDMSredux = reduxPropertiesOfObj(dictEnvDMS, DMS_OPTIONS);
      debugLog(`dictEnvDMSredux:`,dictEnvDMSredux);

      envs = { ...envs, ...dictEnvDMSredux };

      // TODO: rewrite this disgusting loop
      // pull bindings and look for FTS
      var ftsMount = '';
      containerInfo.Mounts.forEach( async (mount) => {
        debugLog(`found mount ${mount.Destination}`);
        if (mount.Destination.match(/fts.*\.conf$/i)) {
          // we get the DMS internal mount as we cannot say if we have access to that file on the host system
          ftsMount = mount.Destination;
        }
      });

      // if we found fts override plugin, let's load it
      if (ftsMount) {
        try {
          const stdout = await execCommand(`cat ${ftsMount}`);
          debugLog(`dovecot file content:`,stdout);
          const ftsConfig = await readDovecotConfFile(stdout);
          debugLog(`dovecot json:`,ftsConfig);
          
          if (ftsConfig.plugin && ftsConfig.plugin.fts) {

            envs.FTS_PLUGIN = ftsConfig.plugin.fts;
            envs.FTS_AUTOINDEX = ftsConfig.plugin.fts_autoindex;

          }

        } catch (error) {
          errorLog(`execCommand failed with error:`,error);
        }
      }

    }
    
    debugLog(`Server pull envs result:`, envs);
    return obj2ArrayOfObj(envs);
    
  } catch (error) {
    let backendError = `${error.message}`;
    errorLog(`${backendError}`);
    throw new Error(backendError);
  }
}


async function getServerEnvs(refresh) {
  refresh = (refresh === undefined) ? true : refresh;
  debugLog(`refresh=${refresh} (${typeof refresh})`);
  
  const containerName = await getSetting('containerName');
  if (!containerName) {
    warnLog('settings.containerNameRequired');
    return [];
  }
  
  if (!refresh) {
    try {
      
      const envs = await dbAll(sql.settings.select.envs, [containerName]);
      debugLog(`envs: envs (${typeof envs})`);
      
      // we could read DB_Logins and it is valid
      if (envs && envs.length) {
        debugLog(`Found ${envs.length} entries in envs`, JSON.stringify(envs));
        return envs;
        // [ { name: 'FTS_PLUGIN', value: 'xapian' }, .. ]
        
      } else {
        debugLog(`envs in db seems empty:`, JSON.stringify(envs));
        return [];
      }
      
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
  
  pulledEnv = await pullServerEnv(containerName);
  debugLog(`got ${Object.keys(pulledEnv).length} pulledEnv from pullServerEnv(${containerName})`, JSON.stringify(pulledEnv));
  
  if (pulledEnv && pulledEnv.length) {
    saveServerEnvs(containerName, pulledEnv);
    return pulledEnv;
    
  // unknown error
  } else {
    errorLog(`pullServerEnv could not pull environment from ${containerName}`);
  }
}


async function saveServerEnvs(containerName, jsonArrayOfObjects) {
  try {
    dbRun(sql.settings.insert.env, jsonArrayOfObjects, containerName); // jsonArrayOfObjects = [{name:name, value:value}, ..]
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


// Function to get dms-gui server infos
async function getServerInfos() {
  return [
    { name: 'DMSGUI_VERSION', value: DMSGUI_VERSION },
    { name: 'HOSTNAME', value: HOSTNAME },
    { name: 'TZ', value: TZ },
    { name: 'NODE_VERSION', value: process.version },
    { name: 'NODE_ENV', value: NODE_ENV },
    { name: 'PORT_NODEJS', value: PORT_NODEJS },
  ];
}



module.exports = {
  getServerStatus,
  getServerInfos,
  getServerEnvs,
  saveServerEnvs,
  getSetting,
  getSettings,
  saveSettings,
};
