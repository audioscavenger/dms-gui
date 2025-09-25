const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Docker container name for docker-mailserver
const DOCKER_CONTAINER = process.env.DOCKER_CONTAINER || 'mailserver';
const SETUP_SCRIPT = process.env.SETUP_SCRIPT || '/usr/local/bin/setup';

// Debug flag
const DEBUG = process.env.DEBUG === 'true';

/**
 * Debug logger that only logs if DEBUG is true
 * @param {string} message - Message to log
 * @param {any} data - Optional data to log
 */
function debugLog(message, data = null) {
  if (DEBUG) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

/**
 * Executes a command in the docker-mailserver container
 * @param {string} command Command to execute
 * @return {Promise<string>} stdout from the command
 */
async function execInContainer(command) {
  try {
    debugLog(`${arguments.callee.name}: Executing command in container ${DOCKER_CONTAINER}: ${command}`);

    // Get container instance
    const container = docker.getContainer(DOCKER_CONTAINER);

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
        stdoutData += chunk.slice(8).toString();
      });

      stream.on('end', () => {
        debugLog(`${arguments.callee.name}: Command completed. Output:`, stdoutData);
        resolve(stdoutData);
      });

      stream.on('error', (err) => {
        debugLog(`${arguments.callee.name}: Command error:`, err);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`${arguments.callee.name}: Error executing command in container: ${command}`, error);
    debugLog(`${arguments.callee.name}: Execution error:`, error);
    throw error;
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

// Function to retrieve email accounts
async function getAccounts() {
  try {
    debugLog(`${arguments.callee.name}: Getting email accounts list`);
    const stdout = await execSetup('email list');

    // Parse multiline output with regex to extract email and size information
    const accounts = [];
    // const emailLineValidChars = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/g;
    const emailLineValidChars = /[^\w\.\~\.\-_@\s\*\%]/g;
    // const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\.\S+)\s+\(\s+([\w\.\~]+)\s+\/\s+([\w\.\~]+)\s+\)\s+\[(\d+)%\]/;
    const accountLineRegexQuotaON  = /(\*\s+)(\S+)@(\S+\.\S+)\s+([\w\.\~]+)\s+([\w\.\~]+)\s+(\d+)%/;
    const accountLineRegexQuotaOFF = /(\*\s+)(\S+)@(\S+\.\S+)/;

    // Process each line individually
    const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
    // debugLog(`${arguments.callee.name}: email list RAW response:`, lines);

    for (let i = 0; i < lines.length; i++) {
      debugLog(`${arguments.callee.name}: email list line RAW  :`, lines[i]);
      
      // Clean the line from binary control characters
      const line = lines[i].replace(emailLineValidChars, '').trim();
      debugLog(`${arguments.callee.name}: email list line CLEAN:`, line);

      // Check if line contains * which indicates an account entry
      if (line.includes('*')) {
        const matchQuotaON  = line.match(accountLineRegexQuotaON);
        const matchQuotaOFF = line.match(accountLineRegexQuotaOFF);

        if (matchQuotaON) {
          // matchQuotaON = [ "* user@domain.com ( 2.5G / 30G ) [8%]", "* ", "user", "domain.com", "2.5G", "30G", "8" ]
          // matchQuotaON = [ "* user@domain.com 2.5G 30G 8%", "* ", "user", "domain.com", "2.5G", "30G", "8" ]
          const email = `${matchQuotaON[2]}@${matchQuotaON[3]}`;
          
          // this works only if Dovecot ENABLE_QUOTAS=1
          const usedSpace = matchQuotaON[4];
          const totalSpace = matchQuotaON[5] === '~' ? 'unlimited' : matchQuotaON[5];
          const usagePercent = matchQuotaON[6];

          debugLog(
            `Parsed account: ${email}, Storage: ${usedSpace}/${totalSpace} [${usagePercent}%]`
          );

          accounts.push({
            email,
            storage: {
              used: usedSpace,
              total: totalSpace,
              percent: usagePercent + '%',
            },
          });
        } else if  (matchQuotaOFF) {
          // matchQuotaOFF = [ "* user@domain.com", "* ", "user", "domain.com" ]
          const email = `${matchQuotaOFF[2]}@${matchQuotaOFF[3]}`;

          accounts.push({
            email,
          });
        } else {
          debugLog(`${arguments.callee.name}: Failed to parse account line: ${line}`);
        }
      }
    }

    debugLog(`${arguments.callee.name}: Found ${accounts.length} accounts`);
    return accounts;
  } catch (error) {
    console.error(`${arguments.callee.name}: Error retrieving accounts:`, error);
    debugLog(`${arguments.callee.name}: Account retrieval error:`, error);
    throw new Error('Unable to retrieve account list');
  }
}

// Function to add a new email account
async function addAccount(email, password) {
  try {
    debugLog(`${arguments.callee.name}: Adding new email account: ${email}`);
    await execSetup(`email add ${email} ${password}`);
    debugLog(`${arguments.callee.name}: Account created: ${email}`);
    return { success: true, email };
  } catch (error) {
    console.error(`${arguments.callee.name}: Error adding account:`, error);
    debugLog(`${arguments.callee.name}: Account creation error:`, error);
    throw new Error('Unable to add email account');
  }
}

// Function to update an email account password
async function updateAccountPassword(email, password) {
  try {
    debugLog(`${arguments.callee.name}: Updating password for account: ${email}`);
    await execSetup(`email update ${email} ${password}`);
    debugLog(`${arguments.callee.name}: Password updated for account: ${email}`);
    return { success: true, email };
  } catch (error) {
    console.error(`${arguments.callee.name}: Error updating account password:`, error);
    debugLog(`${arguments.callee.name}: Account password update error:`, error);
    throw new Error('Unable to update email account password');
  }
}

// Function to delete an email account
async function deleteAccount(email) {
  try {
    debugLog(`${arguments.callee.name}: Deleting email account: ${email}`);
    await execSetup(`email del ${email}`);
    debugLog(`${arguments.callee.name}: Account deleted: ${email}`);
    return { success: true, email };
  } catch (error) {
    console.error(`${arguments.callee.name}: Error deleting account:`, error);
    debugLog(`${arguments.callee.name}: Account deletion error:`, error);
    throw new Error('Unable to delete email account');
  }
}

// Function to retrieve aliases
async function getAliases() {
  try {
    debugLog(`${arguments.callee.name}: Getting aliases list`);
    const stdout = await execSetup('alias list');
    const aliases = [];

    // Parse each line in the format "* source destination"
    const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
    debugLog(`${arguments.callee.name}: Raw alias list response:`, lines);

    // Modified regex to be more tolerant of control characters that might appear in the output
    const aliasRegex = /\* ([\w\-\.@]+) ([\w\-\.@]+)$/;

    for (let i = 0; i < lines.length; i++) {
      // Clean the line from binary control characters
      const line = lines[i].replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();

      if (line.includes('*')) {
        const match = line.match(aliasRegex);
        if (match) {
          const source = match[1];
          const destination = match[2];
          debugLog(`${arguments.callee.name}: Parsed alias: ${source} -> ${destination}`);

          aliases.push({
            source,
            destination,
          });
        } else {
          debugLog(`${arguments.callee.name}: Failed to parse alias line: ${line}`);
        }
      }
    }

    debugLog(`${arguments.callee.name}: Found ${aliases.length} aliases`);
    return aliases;
  } catch (error) {
    console.error(`${arguments.callee.name}: Error retrieving aliases:`, error);
    debugLog(`${arguments.callee.name}: Alias retrieval error:`, error);
    throw new Error('Unable to retrieve alias list');
  }
}

// Function to add an alias
async function addAlias(source, destination) {
  try {
    debugLog(`${arguments.callee.name}: Adding new alias: ${source} -> ${destination}`);
    await execSetup(`alias add ${source} ${destination}`);
    debugLog(`${arguments.callee.name}: Alias created: ${source} -> ${destination}`);
    return { success: true, source, destination };
  } catch (error) {
    console.error(`${arguments.callee.name}: Error adding alias:`, error);
    debugLog(`${arguments.callee.name}: Alias creation error:`, error);
    throw new Error('Unable to add alias');
  }
}

// Function to delete an alias
async function deleteAlias(source, destination) {
  try {
    debugLog(`${arguments.callee.name}: Deleting alias: ${source} => ${destination}`);
    await execSetup(`alias del ${source} ${destination}`);
    debugLog(`${arguments.callee.name}: Alias deleted: ${source} => ${destination}`);
    return { success: true, source, destination };
  } catch (error) {
    console.error(`${arguments.callee.name}: Error deleting alias:`, error);
    debugLog(`${arguments.callee.name}: Alias deletion error:`, error);
    throw new Error('Unable to delete alias');
  }
}

// Function to check server status
async function getServerStatus() {
  try {
    debugLog(`${arguments.callee.name}: Getting server status`);

    // Get container info
    const container = docker.getContainer(DOCKER_CONTAINER);
    const containerInfo = await container.inspect();

    // Check if container is running
    const isRunning = containerInfo.State.Running === true;
    debugLog(`${arguments.callee.name}: Container running: ${isRunning}`);

    let diskUsage = '0%';
    let cpuUsage = '0%';
    let memoryUsage = '0MB';

    if (isRunning) {
      // Get container stats
      debugLog(`${arguments.callee.name}: Getting container stats`);
      const stats = await container.stats({ stream: false });

      // Calculate CPU usage percentage
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage -
        stats.precpu_stats.cpu_usage.total_usage;
      const systemCpuDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent =
        (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus * 100;
      cpuUsage = `${cpuPercent.toFixed(2)}%`;

      // Calculate memory usage
      const memoryUsageBytes = stats.memory_stats.usage;
      memoryUsage = formatMemorySize(memoryUsageBytes);

      debugLog(`${arguments.callee.name}: Resources - CPU: ${cpuUsage}, Memory: ${memoryUsage}`);

      // For disk usage, we would need to run a command inside the container
      // This could be a more complex operation involving checking specific directories
      // For simplicity, we'll set this to "N/A" or implement a basic check
      diskUsage = 'N/A';
    }

    const result = {
      status: isRunning ? 'running' : 'stopped',
      resources: {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
      },
    };

    debugLog(`${arguments.callee.name}: Server status result:`, result);
    return result;
  } catch (error) {
    console.error(`${arguments.callee.name}: Error checking server status:`, error);
    debugLog(`${arguments.callee.name}: Server status error:`, error);
    return {
      status: 'unknown',
      error: error.message,
    };
  }
}

// Helper function to format memory size
function formatMemorySize(bytes) {
  if (bytes === 0) return '0B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + sizes[i];
}

module.exports = {
  debugLog,
  getAccounts,
  addAccount,
  updateAccountPassword,
  deleteAccount,
  getAliases,
  addAlias,
  deleteAlias,
  getServerStatus,
};
