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
// const fs = require("fs");
// const fsp = fs.promises;
// const crypto = require('node:crypto');



const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// const regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
const regexPrintOnly = /[^\S]/;



// Function to retrieve settings
async function getSettings() {
  var DBdict = {};
  var settings = {};
  debugLog(`${arguments.callee.name}: start`);
  
  try {
    
    debugLog(`${arguments.callee.name}: calling DBdict readJson(${DB_Settings})`);
    DBdict = await readJson(DB_Settings);
    debugLog(`${arguments.callee.name}: DBdict:`, DBdict);
    
    // we could read DB_Settings and it is valid
    if (DBdict.constructor == Object && 'settings' in DBdict) {
      debugLog(`${arguments.callee.name}: Found ${Object.keys(DBdict['settings']).length} settings in DB_Settings`);
      return DBdict['settings'];
      
    // we could not read DB_Settings or it is invalid
    } else {
      console.log(`${arguments.callee.name}: ${DB_Settings} is empty`);
    }
    
    return settings;
    
  } catch (error) {
    let backendError = 'Error retrieving settings';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
  }
}


// Function to save settings
async function saveSettings(containerName, setupPath=SETUP_SCRIPT, dnsProvider='') {
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
    let backendError = 'Error saving settings';
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    throw new Error(ErrorMsg);
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
    debugLog(`${arguments.callee.name}: Pulling server status`);
    
    // Get container info
    const container = docker.getContainer(DMS_CONTAINER);
    const containerInfo = await container.inspect();
    // debugLog(`${arguments.callee.name}: ddebug containerInfo:`, containerInfo);

    // Check if container exist
    status.status.status = (containerInfo.Id) ? "stopped" : "missing";
    
    if ( status.status.status != "missing") {
      
      // Check if container is running
      const isRunning = containerInfo.State.Running === true;
      debugLog(`${arguments.callee.name}: Container running: ${isRunning} status.status=`,status.status);

      // get also errors and stuff
      status.status.Error = containerInfo.State.Error;
      status.status.StartedAt = containerInfo.State.StartedAt;
      status.status.FinishedAt = containerInfo.State.FinishedAt;
      status.status.Health = containerInfo.State.Health.Status;

      // pull cpu stats if isRunning
      if (isRunning) {
        status.status.status = 'running';
        
        // Get container stats
        debugLog(`${arguments.callee.name}: Getting container stats`);
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

        debugLog(`${arguments.callee.name}: Resources:`, status.resources);

        // For disk usage, we would need to run a command inside the container
        // This could be a more complex operation involving checking specific directories
        // For simplicity, we'll set this to "N/A" or implement a basic check
        status.resources.diskUsage = 'N/A';
      }
    }

    debugLog(`${arguments.callee.name}: Server pull status result:`, status);
    return status;
    
  } catch (error) {
    let backendError = `Server pull status error: ${error}`;
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    return {
      status: 'unknown',
      error: error.message,
    };
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
  if (debug) console.debug(`${arguments.callee.name}: cleanData:`, cleanData);

  try {
    const json = jsonFixTrailingCommas(cleanData, true);
    if (debug) console.debug(`${arguments.callee.name}: json:`, json);
    return json;
  } catch (error) {
    console.error(`${arguments.callee.name}: cleanData not valid JSON:`, error);
    return {};
  }
}


// Function to pull server infos
async function pullServerInfos() {
  var DBdict = {};
  var infos = {
    env: {FTS_PLUGIN: "none", FTS_AUTOINDEX: 'no'},
  };

  try {
    debugLog(`${arguments.callee.name}: Pulling server infos`);
    
    // Get container info
    const container = docker.getContainer(DMS_CONTAINER);
    const containerInfo = await container.inspect();

    if (containerInfo.Id) {
      debugLog(`${arguments.callee.name}: containerInfo found, Id=`, containerInfo.Id);
      
      // get and conver DMS environment to dict
      dictEnvDMS = arrayOfStringToDict(containerInfo.Config.Env, '=');
      // debugLog(`${arguments.callee.name}: dictEnvDMS:`,dictEnvDMS);
      
      // we keep only some options not all
      dictEnvDMSredux = reduxPropertiesOfObj(dictEnvDMS, DMS_OPTIONS);
      debugLog(`${arguments.callee.name}: dictEnvDMSredux:`,dictEnvDMSredux);
      // infos['env'] = dictEnvDMSredux;
      // console.debug('ddebug --------------- 1 infos.env',infos.env);
      infos.env = { ...infos.env, ...dictEnvDMSredux };
      // console.debug('ddebug --------------- 2 infos.env',infos.env);

      // pull bindings and look for FTS
      var ftsMount = '';
      containerInfo.Mounts.forEach( async (mount) => {
        if (debug) console.debug(`${arguments.callee.name}: found mount ${mount.Destination}`);
        if (mount.Destination.match(/fts.*\.conf$/i)) {
          ftsMount = mount.Destination;
          // console.debug('ddebug --------------- 4');
        }
        // console.debug('ddebug --------------- 5 mounbt analyzed');
      });
      // console.debug('ddebug --------------- 6');

      // we found fts override plugin, let's load it
      try {
        const stdout = await execCommand(`cat ${ftsMount}`);
        if (debug) console.debug(`${arguments.callee.name}: dovecot file content:`,stdout);
        const ftsConfig = await readDovecotConfFile(stdout);
        if (debug) console.debug(`${arguments.callee.name}: dovecot json:`,ftsConfig);
        
        if (ftsConfig.plugin && ftsConfig.plugin.fts) {
          // console.debug('ddebug --------------- ftsConfig pulled:',ftsConfig);
          infos.env.FTS_PLUGIN = ftsConfig.plugin.fts;
          infos.env.FTS_AUTOINDEX = ftsConfig.plugin.fts_autoindex;
          // console.debug('ddebug --------------- ftsConfig pulled infos.env:',infos.env);
        }
        // console.debug('ddebug --------------- 7');
      } catch (error) {
        // console.debug('ddebug --------------- 8');
        console.error(`${arguments.callee.name}: execCommand failed with error:`,error);
      }

    }
    // console.debug('ddebug --------------- 9');
    
    debugLog(`${arguments.callee.name}: Server pull infos result:`, infos);
    // console.debug('ddebug --------------- infos pulled:',infos);
    return infos;
    
  } catch (error) {
    let backendError = `Server pull infos error: ${error}`;
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    return {
      infos: 'unknown',
      error: error.message,
    };
  }
}


// Function to get server infos
async function getServerInfos(refresh) {
  refresh = (refresh === undefined) ? true : refresh;
  debugLog(`${arguments.callee.name}: refresh=${refresh} (${typeof refresh})`);
  
  var DBdict = {};
  var pulledInfos = {};
  var infos = {
    internals: [
      { name: 'DMSGUI_VERSION', value: DMSGUI_VERSION },
      { name: 'HOSTNAME', value: HOSTNAME },
      { name: 'TZ', value: TZ },
      { name: 'NODE_VERSION', value: process.version },
      { name: 'NODE_ENV', value: NODE_ENV },
      { name: 'PORT_NODEJS', value: PORT_NODEJS },
    ],
    env: {FTS_PLUGIN: "none", FTS_AUTOINDEX: 'no'},
  };
  // console.debug('ddebug ----------  before try, typeof refresh=',typeof refresh);

  // dbRun('select', 'settings');
  
  try {

    if (!refresh) {
      // console.debug('ddebug ----------  refresh=',refresh);
       debugLog(`${arguments.callee.name}: read DBdict from ${DB_Infos} (refresh=${refresh})`);
      DBdict = await readJson(DB_Infos);
      // debugLog(`${arguments.callee.name}: DBdict:`, DBdict);
    
      // we could read DB_Infos and it is valid
      if (DBdict.constructor == Object && 'infos' in DBdict && DBdict.infos.env) {
        debugLog(`${arguments.callee.name}: Found ${Object.keys(DBdict['infos']).length} infos in DBdict`);
        return DBdict['infos'];
      }
      
      // we could not read DB_Infos or it is invalid, pull it from container (costly)
    }

    console.debug('ddebug ---------- DBdict.infos',DBdict.infos);
    // force refresh if no db
    if (!(DBdict.infos && DBdict.infos.env)) {
      console.debug('ddebug ---------- else Calling pullServerInfos()...');
      pulledInfos = await pullServerInfos();
      debugLog(`${arguments.callee.name}: got ${Object.keys(pulledInfos).length} pulledInfos from pullServerInfos()`);
    }
    
    console.debug('ddebug ----------  after if, pulledInfos=',pulledInfos);
    console.debug('ddebug ----------  pulledInfos length=',Object.keys(pulledInfos).length);
    // since we had to call pullServerInfos, we save DB_Infos
    if (typeof pulledInfos == "object" && Object.keys(pulledInfos).length) {
      infos = { ...infos, ...pulledInfos };
      DBdict["infos"] = infos;
      await writeJson(DB_Infos, DBdict);
      
    // unknown error
    } else {
      console.error(`${arguments.callee.name}: error with read infos:`, pulledInfos);
    }


    debugLog(`${arguments.callee.name}: Server read infos result:`, pulledInfos);
    return DBdict.infos;
    
  } catch (error) {
    let backendError = `Server read infos error: ${error}`;
    let ErrorMsg = await formatDMSError(backendError, error);
    console.error(`${arguments.callee.name}: ${backendError}: `, ErrorMsg);
    return {
      infos: 'unknown',
      error: error.message,
    };
  }
}


module.exports = {
  getServerStatus,
  getServerInfos,
  getSettings,
  saveSettings,
};
