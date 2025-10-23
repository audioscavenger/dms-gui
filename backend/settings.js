require('./env.js');
const {
  docker,
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  jsonFixTrailingCommas,
  reduxPropertiesOfObj,
  arrayOfStringToDict,
  obj2ArrayOfObj,
  getValueFromArrayOfObj,
  byteSize2HumanSize,
  humanSize2ByteSize,
  execSetup,
  execCommand,
  readJson,
  writeJson,
  regexColors,
  regexPrintOnly,
  getContainer,
} = require('./backend.js');
const {
  sql,
  dbRun,
  dbAll,
  dbGet,
} = require('./db.js');

// const fs = require("fs");
// const fsp = fs.promises;
const path = require('node:path');

// returns a string
async function getSetting(name) {
  try {
    
    const setting = await dbGet(sql.settings.select.setting, name);
    return setting?.value;
    
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


// this returns an array of objects
async function getSettings(name) {
  if (name) return getSetting(name);
  
  try {
    
    const settings = await dbAll(sql.settings.select.settings);
    debugLog(`settings: settings (${typeof settings})`);
    
    // we could read DB_Logins and it is valid
    if (settings && settings.length) {
      infoLog(`Found ${settings.length} entries in settings`);
    
    } else {
      warnLog(`db seems empty:`, settings);
    }
    
    return settings;
    // [ { name: 'containerName', value: 'dms' }, .. ]
    
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
    global.DMS_CONTAINER = getValueFromArrayOfObj(jsonArrayOfObjects, 'containerName');
    successLog(`Saved ${settings.length} settings in db`);
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


// Function to get server status
async function getServerStatus(containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  var DBdict = {};
  var status = {
    status: {
      status: 'missing',
      Error: '',
      StartedAt: '',
      FinishedAt: '',
      Health: '',
    },
    resources: {
      cpuUsage: '0%',
      memoryUsage: '0MB',
      diskUsage: '0%',
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
      debugLog(`Container running: ${isRunning} status.status=`, status.status);

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
        // For simplicity, we'll set this to "N/A" or implement a basic check
        status.resources.diskUsage = 'N/A';
      }
    }

    debugLog(`Server pull status result:`, status);
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
    debugLog(`json:`, json);
    return json;
  } catch (error) {
    errorLog(`cleanData not valid JSON:`, error);
    return {};
  }
}


// function readDkimFile will convert dkim conf file syntax to JSON
async function readDkimFile(stdout) {
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
  debugLog(`cleanData:`, cleanData);

  try {
    const json = jsonFixTrailingCommas(cleanData, true);
    debugLog(`json:`, json);
    return json;
    
  } catch (error) {
    errorLog(`cleanData not valid JSON:`, error);
    return {};
  }
}


// async function pullFTS(envs, containerName, containerInfo) {
async function pullFTS(containerName, containerInfo) {
  let ftsMount = '';
  let envs = {};

  try {
    
    containerInfo.Mounts.forEach( async (mount) => {
      debugLog(`found mount ${mount.Destination}`);
      if (mount.Destination.match(/fts.*\.conf$/i)) {
        // we get the DMS internal mount as we cannot say if we have access to that file on the host system
        ftsMount = mount.Destination;
      }
    });

    // if we found fts override plugin, let's load it
    if (ftsMount) {
      const ftsMount_out = await execCommand(`cat ${ftsMount}`, containerName);
      debugLog(`dovecot file content:`,ftsMount_out);
      const ftsConfig = await readDovecotConfFile(ftsMount_out);
      debugLog(`dovecot json:`, ftsConfig);
      
      if (ftsConfig?.plugin?.fts) {

        envs.DOVECOT_FTS_PLUGIN = ftsConfig.plugin.fts;
        envs.DOVECOT_FTS_AUTOINDEX = ftsConfig.plugin.fts_autoindex;

      }
    }
    
  } catch (error) {
    errorLog(`execCommand failed with error:`,error);
  }
  return envs;
}


// async function pullDkimRspamd(envs, containerName) {
async function pullDkimRspamd(containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  // we pull only if ENABLE_RSPAMD=1 because we don't know what the openDKIM config looks like
  let envs = {};
  try {
    const dkim_out = await execCommand(`cat ${DMS_CONFIG_PATH}/rspamd/override.d/dkim_signing.conf`, containerName);
    debugLog(`dkim file content:`, dkim_out);
    // TODO: decide if we want to propagate execInContainer errors, since dkim_out can very well be stderr="cat: whatever: No such file or directory"
    
    const dkimConfig = await readDkimFile(dkim_out);
    debugLog(`dkim json:`, dkimConfig);
    
    envs.DKIM_ENABLED   = dkimConfig?.enabled;
    envs.DKIM_SELECTOR  = dkimConfig?.selector || DKIM_SELECTOR_DEFAULT;
    envs.DKIM_PATH      = dkimConfig?.path;

    if (dkimConfig?.domain) {
      for (const [domain, item] of Object.entries(dkimConfig.domain)) {
        let split, [keytype, keysize] = ['', ''];
        if (item?.path) {
          split = path.basename(item.path).split('-');  // [ 'rsa', '2048', 'dkim', '$domain.private.txt' ]
          keytype = split[0];
          keysize = split[1];
        }
        (item?.selector) && dbRun(sql.domains.insert.domain, {domain:domain, dkim:item?.selector, keytype:keytype, keysize:keysize, path:(item?.path || envs.DKIM_PATH)}, containerName);
      }
    }

  } catch (error) {
    errorLog(`execCommand failed with error:`,error);
  }
  return envs;
}


// Function to pull server environment
async function pullServerEnvs(containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  var envs = {DKIM_SELECTOR_DEFAULT: DKIM_SELECTOR_DEFAULT };
  try {
    
    // Get container instance
    let container = getContainer(containerName);
    let containerInfo = await container.inspect();

    if (containerInfo.Id) {
      debugLog(`containerInfo found, Id=`, containerInfo.Id);
      
      // get and conver DMS environment to dict ------------------------------------------ envs
      dictEnvDMS = arrayOfStringToDict(containerInfo.Config?.Env, '=');
      // debugLog(`dictEnvDMS:`,dictEnvDMS);
      
      // we keep only some options not all
      dictEnvDMSredux = reduxPropertiesOfObj(dictEnvDMS, DMS_OPTIONS);
      debugLog(`dictEnvDMSredux:`,dictEnvDMSredux);

      envs = { ...envs, ...dictEnvDMSredux };

      // look for dovecot mail_plugins -------------------------------------------------- mail_plugins
      const mail_plugins = await execCommand(`doveconf mail_plugins`, containerName);   // mail_plugins =  quota fts fts_xapian zlib
      // [ "mail_plugins", "quota", "fts", "fts_xapian", "zlib" ]
      // the bellow will add those items: envs.DOVECOT_QUOTA, DOVECOT_FTS, DOVECOT_FTP_XAPIAN and DOVECOT_ZLIB
      for (const PLUGIN of mail_plugins.split(/[=\s]+/)) {
        if (PLUGIN && PLUGIN.toUpperCase() != 'MAIL_PLUGINS') envs[`DOVECOT_${PLUGIN.toUpperCase()}`] = 1;
      }
      
      // TODO: look for quotas -------------------------------------------------- quota
      
      // look for FTS values -------------------------------------------------- fts
      // if (envs?.DOVECOT_FTS) envs = await pullFTS(envs, containerName, containerInfo);
      if (envs?.DOVECOT_FTS) envs = await { ...envs, ...pullFTS(containerName, containerInfo) };

      // pull dkim conf ------------------------------------------------------------------ dkim rspamd
      // if (envs?.ENABLE_RSPAMD) envs = await pullDkimRspamd(envs, containerName);
      if (envs?.ENABLE_RSPAMD) envs = await { ...envs, ...pullDkimRspamd(containerName) };

    }
    
    debugLog(`Server pull envs result:`, envs);
    return obj2ArrayOfObj(envs, true);
    
  } catch (error) {
    let backendError = `${error.message}`;
    errorLog(`${backendError}`);
    throw new Error(backendError);
  }
}


async function getServerEnv(name, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`name=${name} for ${containerName}`);
  
  try {

    const env = await dbGet(sql.settings.select.env, name, containerName);
    return env?.value;
    
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


async function getServerEnvs(refresh, containerName) {
  refresh = (refresh === undefined) ? true : refresh;
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`refresh=${refresh} for ${containerName}`);
  
  if (!refresh) {
    try {
      
      const envs = await dbAll(sql.settings.select.envs, containerName);
      debugLog(`envs: envs (${typeof envs})`);
      
      // we could read DB_Logins and it is valid
      if (envs && envs.length) {
        infoLog(`Found ${envs.length} entries in envs`, envs);
        return envs;
        // [ { name: 'DOVECOT_FTS_PLUGIN', value: 'xapian' }, .. ]
        
      } else {
        warnLog(`envs in db seems empty:`, JSON.stringify(envs));
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
  
  pulledEnv = await pullServerEnvs(containerName);
  infoLog(`got ${Object.keys(pulledEnv).length} pulledEnv from pullServerEnvs(${containerName})`, pulledEnv);
  
  if (pulledEnv && pulledEnv.length) {
    saveServerEnvs(pulledEnv, containerName);
    return pulledEnv;
    
  // unknown error
  } else {
    errorLog(`pullServerEnvs could not pull environment from ${containerName}`);
  }
}


async function saveServerEnvs(jsonArrayOfObjects, containerName) {
  try {
    dbRun(sql.settings.delete.envs, containerName);
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


async function getDomain(name) {
  try {
    
    const domain = await dbGet(sql.settings.select.domain, name);
    return domain;
    
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


async function getDomains(name) {
  if (name) return getDomain(name);
  
  try {
    
    const domains = await dbAll(sql.domains.select.domains);
    debugLog(`domains: domains (${typeof domains})`);
    
    // we could read DB_Logins and it is valid
    if (domains && domains.length) {
      infoLog(`Found ${domains.length} entries in domains`);
      return domains;
      // [ { name: 'containerName', value: 'dms' }, .. ]
      
    } else {
      warnLog(`domains in db seems empty:`, domains);
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



module.exports = {
  getServerStatus,
  getServerInfos,
  getServerEnv,
  getServerEnvs,
  saveServerEnvs,
  getSetting,
  getSettings,
  saveSettings,
};
