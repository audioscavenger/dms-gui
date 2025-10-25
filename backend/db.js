require('./env.js');
const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
  reduxPropertiesOfObj,
} = require('./backend');

const crypto = require('node:crypto');

var DB;

// rsa-2048-dkim-$domain.private.txt
// keytypes = ['rsa','ed25519']
// keysizes = ['1024','2048']

sqlMatch = {
  add: {
    patch: /ALTER[\s]+TABLE[\s]+[\"]?[\w]+[\"]?[\s]+ADD[\s]+[\"]?(\w+)[\"]?/i,
    err:  /duplicate[\s]+column[\s]+name:[\s]+[\"]?(\w+)[\"]?/i,
  },
  drop: {
    patch: /DROP[\s]+COLUMN[\s]+[\"]?(\w+)[\";]?/i,
    err:  /no[\s]+such[\s]+column[:\s]+[\"]?(\w+)[\"]?/i,
  },
  get: {
    err:  /no[\s]+such[\s]+column[:\s]+[\"]?(\w+)[\"]?/i,
  },
}


// in-memory database: https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#serializeoptions---buffer
// const buffer = DB.serialize();
// DB.close();
// DB = new Database(buffer);

// columns we can update for each table along with their type
updateValidKeys = {
  accounts: {password:'string', },
  logins:   {password:'string', email:'string', isAdmin:'number', isActive:'number', roles:'object'},
}


// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#transactionfunction---function
    // password: `REPLACE INTO accounts (mailbox, salt, hash, scope) VALUES (@mailbox, @salt, @hash, ?)`,
sql = {
settings: {

  select: {
    settings: `SELECT name, value from settings WHERE 1=1 AND isMutable = ${isMutable} AND scope = 'dms-gui'`,
    setting:  `SELECT value       from settings WHERE 1=1 AND isMutable = ${isMutable} AND scope = 'dms-gui' AND name = ?`,
    envs:     `SELECT name, value from settings WHERE 1=1 AND isMutable = ${isImmutable} AND scope = ?`,
    env:      `SELECT value       from settings WHERE 1=1 AND isMutable = ${isImmutable} AND scope = ? AND name = ?`,
  },
  
  insert: {
    setting:  `REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, 'dms-gui', 1)`,
    env:      `REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, ?, 0)`,
  },
  
  delete: {
    envs:     `DELETE from settings WHERE 1=1 AND isMutable = ${isImmutable} AND scope = ?`,
    env:      `DELETE from settings WHERE 1=1 AND isMutable = ${isImmutable} AND scope = ? AND name = ?`,
  },
  
  init:   `BEGIN TRANSACTION;
          CREATE  TABLE settings (
          name    TEXT NOT NULL UNIQUE PRIMARY KEY,
          value   TEXT NOT NULL,
          scope   TEXT NOT NULL,
          isMutable BIT DEFAULT ${isImmutable}
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_settings', '${DMSGUI_VERSION}', 'dms-gui', 0);
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.0.17',
      patches: [
        `ALTER TABLE settings ADD scope TEXT DEFAULT '${DMS_CONTAINER}'`,
        `ALTER TABLE settings ADD isMutable BIT DEFAULT ${isImmutable}`,
        `REPLACE INTO settings (name, value, scope, isMutable)  VALUES ('DB_VERSION_settings', '1.0.17', 'dms-gui', ${isImmutable})`,
      ],
    },
  ],
},

logins: {
      
  select: {
    usernames:`SELECT username from logins WHERE 1=1`,
    username: `SELECT username from logins WHERE 1=1 AND username = ?`,
    logins:   `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1`,
    admins:   `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND isAdmin = 1`,
    login:    `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND username = ?`,
    roles:    `SELECT roles from logins WHERE 1=1 AND username = ?`,
    salt:     `SELECT salt from logins WHERE username = ?`,
    hash:     `SELECT hash from logins WHERE username = ?`,
    saltHash: `SELECT salt, hash FROM logins WHERE username = ?`,
    isActive: {
      usernames:`SELECT username from logins WHERE 1=1 AND isActive = 1`,
      username: `SELECT username from logins WHERE 1=1 AND isActive = 1 AND username = ?`,
      logins:   `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND isActive = 1`,
      admins:   `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1`,
      login:    `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND isActive = 1 AND username = ?`,
      roles:    `SELECT roles from logins WHERE 1=1 AND isActive = 1 AND username = ?`,
    },
    isInactive: {
      usernames:`SELECT username from logins WHERE 1=1 AND isActive = 0`,
      username: `SELECT username from logins WHERE 1=1 AND isActive = 0 AND username = ?`,
      logins:   `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND isActive = 0`,
      admins:   `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND isActive = 0 AND isAdmin = 1`,
      login:    `SELECT username, email, isAdmin, isActive, roles from logins WHERE 1=1 AND isActive = 0 AND username = ?`,
      roles:    `SELECT roles from logins WHERE 1=1 AND isActive = 0 AND username = ?`,
    },
  },
  
  insert: {
    login:    `REPLACE INTO logins (username, salt, hash, email, isAdmin, roles) VALUES (@username, @salt, @hash, @email, @isAdmin, @roles)`,
  },
  
  update: {
    password: `UPDATE logins set salt=@salt, hash=@hash WHERE username = ?`,
    email:    `UPDATE logins set email = @email WHERE username = ?`,
    isAdmin:  `UPDATE logins set isAdmin = @isAdmin WHERE username = ?`,
    isActive: `UPDATE logins set isActive = @isActive WHERE username = ?`,
    roles:    `UPDATE logins set roles = @roles WHERE username = ?`,
  },
  
  delete: {
    login:  `DELETE from logins WHERE 1=1 AND username = ?`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE logins (
          username  TEXT NOT NULL UNIQUE PRIMARY KEY,
          salt      TEXT DEFAULT '',
          hash      TEXT DEFAULT '',
          email     TEXT DEFAULT '',
          isAdmin   BIT DEFAULT 0,
          isActive  BIT DEFAULT 1,
          roles     TEXT DEFAULT '[]'
          );
          INSERT OR IGNORE INTO logins (username, salt, hash, email, isAdmin, isActive, roles) VALUES ('admin', 'fdebebcdcec4e534757a49473759355b', 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18', '', 1, 1, '[]');
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '${DMSGUI_VERSION}', 'dms-gui', ${isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.0.14',
      patches: [
        `ALTER TABLE logins DROP COLUMN password;`,
        `ALTER TABLE logins ADD salt TEXT DEFAULT ''`,
        `ALTER TABLE logins ADD hash TEXT DEFAULT ''`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.0.14', 'dms-gui', ${isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.1',
      patches: [
        `ALTER TABLE logins DROP COLUMN password;`,
        `ALTER TABLE logins ADD salt TEXT DEFAULT ''`,
        `ALTER TABLE logins ADD hash TEXT DEFAULT ''`,
        `INSERT OR IGNORE INTO logins (username, salt, hash) VALUES ('admin', 'fdebebcdcec4e534757a49473759355b', 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18')`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.1.1', 'dms-gui', ${isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.6',
      patches: [
        `ALTER TABLE logins ADD isAdmin    BIT DEFAULT 0`,
        `ALTER TABLE logins ADD isActive   BIT DEFAULT 1`,
        `UPDATE logins set isAdmin = 1 WHERE username = 'admin'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.1.6', 'dms-gui', ${isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.9',
      patches: [
        `ALTER TABLE logins ADD roles    TEXT DEFAULT '"[]"'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.1.9', 'dms-gui', ${isImmutable})`,
      ],
    },
  ],
},

roles: {
      
  select: {
    roles:    `SELECT username, mailbox from roles WHERE 1=1 AND scope = ?`,
    username: `SELECT username        from roles WHERE 1=1 AND scope = ? AND mailbox = ?`,
    mailbox:  `SELECT mailbox           from roles WHERE 1=1 AND scope = ? AND username = ?`,
  },
  
  insert: {
    role:     `REPLACE INTO roles (username, mailbox, scope) VALUES (@username, @mailbox, ?)`,
  },
  
  delete: {
    all:       `DELETE from roles`,
    usernames: `DELETE from roles WHERE 1=1 AND scope = ? AND username = ?`,
    emails:    `DELETE from roles WHERE 1=1 AND scope = ? AND mailbox = ?`,
    role:      `DELETE from roles WHERE 1=1 AND scope = ? AND username = ? AND mailbox = ?`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE roles (
          id        INTEGER PRIMARY KEY,
          username  TEXT NOT NULL,
          mailbox     TEXT NOT NULL,
          scope     TEXT NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_roles', '${DMSGUI_VERSION}', 'dms-gui', ${isImmutable});
          COMMIT;`,
  
},

accounts: {
      
  select: {
    accounts: `SELECT mailbox, domain, storage FROM accounts WHERE 1=1 AND scope = ?`,
    mailboxes:`SELECT mailbox FROM accounts WHERE 1=1 AND scope = ?`,
    mailbox:  `SELECT mailbox FROM accounts WHERE 1=1 AND scope = ? AND mailbox = ?`,
    byDomain: `SELECT mailbox FROM accounts WHERE 1=1 AND scope = ? AND domain = ?`,
  },
  
  insert: {
    fromDMS:  `REPLACE INTO accounts (mailbox, domain, storage, scope) VALUES (@mailbox, @domain, @storage, ?)`,
    fromGUI:  `REPLACE INTO accounts (mailbox, domain, salt, hash, scope) VALUES (@mailbox, @domain, @salt, @hash, ?)`,
  },
  
  update: {
    password: `UPDATE accounts set salt=@salt, hash=@hash WHERE scope=? AND mailbox = ?`,
    storage:  `UPDATE accounts set storage = @storage WHERE 1=1 AND scope = ? AND mailbox = ?`,
  },
  
  delete: {
    account:  `DELETE FROM accounts WHERE 1=1 AND scope = ? AND mailbox = ?`,
    accounts: `DELETE FROM accounts WHERE 1=1 AND scope = ? `,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE accounts (
          mailbox   TEXT NOT NULL UNIQUE PRIMARY KEY,
          domain    TEXT DEFAULT '',
          salt      TEXT DEFAULT '',
          hash      TEXT DEFAULT '',
          storage   TEXT DEFAULT '{}',
          scope     TEXT NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_accounts', '${DMSGUI_VERSION}', 'dms-gui', ${isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.1.3',
      patches: [
        `ALTER TABLE accounts ADD scope   TEXT DEFAULT '${DMS_CONTAINER}'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_accounts', '1.1.3', 'dms-gui', ${isImmutable})`,
      ],
    },
  ],
},

aliases: {
      
  select: {
    aliases:  `SELECT source, destination, regex FROM aliases WHERE 1=1 AND scope = ?`,
    bySource: `SELECT destination FROM aliases WHERE 1=1 AND scope = ? AND source = ?`,
    byDest:   `SELECT source      FROM aliases WHERE 1=1 AND scope = ? AND destination = ?`,
    regexes:  `SELECT source, destination FROM aliases WHERE 1=1 AND regex = 1 AND scope = ?`,
  },
  
  insert: {
    alias:    `REPLACE INTO aliases (source, destination, regex, scope) VALUES (@source, @destination, @regex, ?)`,
  },
  
  delete: {
    bySource: `DELETE FROM aliases WHERE 1=1 AND scope = ? AND source = ?`,
    byDest:   `DELETE FROM aliases WHERE 1=1 AND scope = ? AND destination = ?`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE aliases (
          id          INTEGER PRIMARY KEY,
          source      TEXT NOT NULL UNIQUE,
          destination TEXT NOT NULL,
          regex       BIT DEFAULT 0,
          scope       NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_aliases', '${DMSGUI_VERSION}', 'dms-gui', ${isImmutable});
          COMMIT;`,
  
},

domains: {
      
  select: {
    domains:  `SELECT * FROM domains WHERE 1=1 AND scope = ?`,
    domain:   `SELECT * FROM domains WHERE 1=1 AND scope = ? AND domain = ?`,
    dkims:    `SELECT DISTINCT dkim FROM domains WHERE 1=1 AND scope = ?`,
    dkim:     `SELECT dkim FROM domains WHERE 1=1 AND scope = ? AND domain = ?`,
  },
  
  insert: {
    domain:   `REPLACE INTO domains (domain, dkim, keytype, keysize, path, scope) VALUES (@domain, @dkim, @keytype, @keysize, @path, ?)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE domains (
          domain    TEXT NOT NULL UNIQUE PRIMARY KEY,
          dkim      TEXT DEFAULT '${DKIM_SELECTOR_DEFAULT}',
          keytype   TEXT DEFAULT 'rsa',
          keysize   TEXT DEFAULT '2048',
          path      TEXT DEFAULT '${DMS_CONFIG_PATH}/rspamd/dkim/${DKIM_KEYTYPE_DEFAULT}-${DKIM_KEYSIZE_DEFAULT}-${DKIM_SELECTOR_DEFAULT}-$domain.private.txt',
          scope     TEXT NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '${DMSGUI_VERSION}', 'dms-gui', ${isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.1.2',
      patches: [
        `ALTER TABLE domains ADD keytype TEXT DEFAULT 'rsa'`,
        `ALTER TABLE domains ADD keysize TEXT DEFAULT '2048'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '1.1.2', 'dms-gui', ${isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.3',
      patches: [
        `ALTER TABLE domains ADD scope   TEXT DEFAULT '${DMS_CONTAINER}'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '1.1.3', 'dms-gui', ${isImmutable})`,
      ],
    },
  ],
},

};


function dbOpen() {
  try {
    if (DB && DB.inTransaction) DB.close();
    
    if (!DB || !DB.open) {
      DB = require('better-sqlite3')(DATABASE);
      // const Database = require('better-sqlite3');
      // const DB = new Database('foobar.db', { verbose: console.log });
      DB.pragma('journal_mode = WAL');
      // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#close---this
      process.on('exit', () => DB.close());
      process.on('SIGHUP', () => process.exit(128 + 1));
      process.on('SIGINT', () => process.exit(128 + 2));
      process.on('SIGTERM', () => process.exit(128 + 15));
      
      return DB;
    }
  } catch (err) {
    errorLog(`dbOpen error: ${err.code}: ${err.message}`);
    throw err;
  }
}

// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#binding-parameters
// dbRun takes params as Array = multiple inserts or String/Object = single insert
// dbRun takes multiple anonymous parameters anonParams as an array of strings, for WHERE clause value(s) when needed
function dbRun(sql, params=[], ...anonParams) {

  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=",sql);
  }
  
  try {
    
    // transaction  https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#execstring---this
    if (sql.match(/BEGIN TRANSACTION/i)) {
      debugLog(`DB.exec(${sql})`);
      DB.exec(sql);
      debugLog(`DB.exec success`);

    // multiple inserts https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function
    } else if (Array.isArray(params) && params.length) {
      
      if (anonParams.length) {
        debugLog(`DB.transaction(${sql}).run(${anonParams}, ${JSON.stringify(params)})`);
        const insertMany = DB.transaction((params) => {
          for (const param of params) DB.prepare(sql).run(anonParams, param);
        });
        insertMany(params);
        debugLog(`DB.transaction success`);
      } else {
        debugLog(`DB.transaction(${sql}).run(${JSON.stringify(params)})`);
        const insertMany = DB.transaction((params) => {
          for (const param of params) DB.prepare(sql).run(param);
        });
        insertMany(params);
        debugLog(`DB.transaction success`);
      }
      
    // single statement https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#runbindparameters---object
    } else {
      if (anonParams.length) {
        debugLog(`DB.prepare(${sql}).run(${anonParams}, ${JSON.stringify(params)})`);
        DB.prepare(sql).run(anonParams, params);
        debugLog(`DB.prepare success`);
      } else {
        debugLog(`DB.prepare(${sql}).run(${JSON.stringify(params)})`);
        DB.prepare(sql).run(params);
        debugLog(`DB.prepare success`);
      }
    }
    // result = { changes: 0, lastInsertRowid: 0 }

  } catch (err) {
    debugLog(`${err.code}: ${err.message}`);
    dbOpen()
    throw err;
  }
}
    // dupe table:
      // err.code=SQLITE_ERROR
      // err.message=table xyz already exists
    // dupe insert:
      // err.code=SQLITE_CONSTRAINT_PRIMARYKEY
      // err.message=UNIQUE constraint failed: settings.name
    // missing table:
      // err.code=SQLITE_ERROR
      // err.message=no such table: master
    // drop column that does not exist:
      // err.code=SQLITE_ERROR
      // err.message=no such column: "password"
    // add column that exists:
      // err.code=SQLITE_ERROR
      // err.message=duplicate column name: salt


function dbGet(sql, ...anonParams) {
  
  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=",sql);
  }
  
  try {
    debugLog(`DB.prepare(${sql}).get(${JSON.stringify(anonParams)})`);
    const result = DB.prepare(sql).get(anonParams);
    debugLog(`success:`, JSON.stringify(result));
    return (result) ? result : {};
    // result = { name: 'node', value: 'v24' } or { value: 'v24' } orundefined

  } catch (err) {
    errorLog(`${err.code}: ${err.message}`);
    dbOpen();
    throw err;
  }
}

function dbAll(sql, ...anonParams) {
  
  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=",sql);
  }
  
  try {
    debugLog(`DB.prepare(${sql}).all(${JSON.stringify(anonParams)})`);
    const result = DB.prepare(sql).all(anonParams);
    debugLog(`success:`, JSON.stringify(result));
    return (result) ? result : [];
    // result = [ { name: 'node', value: 'v24' }, { name: 'node2', value: 'v27' } ] or []

  } catch (err) {
    errorLog(`${err.code}: ${err.message}`);
    dbOpen();
    throw err;
  }
}

function dbInit() {

  debugLog(`start`);
  dbOpen();

  for (const [table, actions] of Object.entries(sql)) {
    
    // init db table no matter what
    if (actions.init) {
      try {
        dbRun(actions.init);
        successLog(`${table}: success`);
        
      } catch (err) {
        if (!err.message.match(/already exists/i)) {
          errorLog(`${table}: ${err.code}: ${err.message}`);
          throw err;
        } else infoLog(`${table}: ${err.message}`);
      }
    }
  }
  DB.close()

  try {
    dbUpdate();
  } catch (err) {
    errorLog(`${err.code}: ${err.message}`);
    throw err;
  }
  debugLog(`end`);
}


function dbUpdate() {
  debugLog(`start`);

  dbOpen();
  let db_version;
  for (const [table, actions] of Object.entries(sql)) {
    try {
      db_version = dbGet(sql.settings.select.env, 'dms-gui', `DB_VERSION_${table}`);
      db_version = (db_version) ? db_version.value : undefined;
      debugLog(`DB_VERSION_${table}=`, db_version);
      
    } catch (err) {
      match = {
        get: {
          err:  err.message.match(sqlMatch.get.err),
        },
      }
      
      // column does not exist or smth like that... patch needed
      if (match.get.err) {
        debugLog(`DB_VERSION_${table}= PATCH NEEDED`);
        
      } else {
        errorLog(`DB_VERSION_${table}= ${err.code}: ${err.message}`);
        throw err;
      }
    }
    
    // now check if we need patches for that table
    // 0: version strings are equal
    // 1: version a is greater than b
    // -1:version b is greater than a
    
    // first, check if there are any patches available
    if (actions.patch && actions.patch.length) {
      // now check is patches ar needed
      if (!db_version || db_version.localeCompare(DMSGUI_VERSION, undefined, { numeric: true, sensitivity: 'base' }) == -1) {
      
      // now check each patch array if we need it
        for (const patch of actions.patch) {
          // if patch version > current db_version then run it
          if (!db_version || db_version.localeCompare(patch.DB_VERSION, undefined, { numeric: true, sensitivity: 'base' }) == -1) {
            
            // patch.patches is a array of SQL lines to ADD or DROP columns etc
            for (const [num, patchLine] of Object.entries(patch.patches)) {
              try {
                dbRun(patchLine);
                successLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: success`);
                
              } catch (err) {
                match = {
                  add: {
                    patch: patchLine.match(sqlMatch.add.patch),
                    err:  err.message.match(sqlMatch.add.err),
                  },
                  drop: {
                    patch: patchLine.match(sqlMatch.drop.patch),
                    err:  err.message.match(sqlMatch.drop.err),
                  }
                }
                
                // ADD COLUMN already exists:
                if (match.add.patch && match.add.err && match.add.patch[1].toUpperCase() == match.add.err[1].toUpperCase()) {
                  infoLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: skip`);
                
                // DROP COLUMN does not exist:
                } else if (match.drop.patch && match.drop.err && match.drop.patch[1].toUpperCase() == match.drop.err[1].toUpperCase()) {
                  infoLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: skip`);
                  
                } else {
                  errorLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: ${err.code}: ${err.message}`);
                  throw err;
                }
              }
            }
            db_version = patch.DB_VERSION;
          }
        }
      }
    }

  }
  DB.close()
  dbOpen();
  debugLog(`end`);
}
// ("ALTER TABLE logins ADD salt xxx".match(/ALTER[\s]+TABLE[\s]+[\"]?(\w+)[\"]?[\s]+ADD[\s]+(\w+)/i)[2] == 'column "salt" already exists'.match(/column[\s]+[\"]?(\w+)[\"]?[\s]+already[\s]+exists/i)[1])


async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex'); // Generate a random 16-byte salt
    crypto.scrypt(password, salt, 64, (err, derivedKey) => { // 64 is the key length
      if (err) return reject(err);
      resolve({ salt, hash: derivedKey.toString('hex') }); // Store salt and hash as hex strings
    });
  });
}


// verifyPassword works the same wherever a table has a salted hash
async function verifyPassword(username, password, table='logins') {
  
  try {
    debugLog(`for ${username}`);
    const result = dbGet(sql[table].select.saltHash, username);

    return new Promise((resolve, reject) => {
      if (Object.keys(result).length) {
        if (result.salt && result.hash) {
          crypto.scrypt(password, result.salt, 64, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(result.hash === derivedKey.toString('hex'));
          });
        } else return reject(`please reset password for ${username}`);
      } else return reject(`username ${username} not found`);
    });

  } catch (error) {
    let backendError = error.message;
    errorLog(`${backendError}`);
    throw new Error(backendError);
  }

};


// Function to update a password in a table
async function changePassword(table, id, password, containerName) {
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`for ${containerName}`);

  try {
    const { salt, hash } = await hashPassword(password);
    
    // special case for accounts as we need to run a command in the container
    if (table == 'accounts') {
      debugLog(`Updating password for ${id} in ${containerName}...`);
      const result = await execSetup(`email update ${id} ${password}`);
      if (!result.exitCode) {
        
        debugLog(`Updating password for ${id} in ${table}...`);
        dbRun(sql[table].update.password, { salt:salt, hash:hash }, containerName, id);
        successLog(`Password updated for ${table}: ${mailbox}`);
        return { success: true };
        
      } else errorLog(result.stderr);
      
    } else {
      debugLog(`Updating password for ${id} in ${table}...`);
      dbRun(sql.logins.update.password, { salt:salt, hash:hash }, id);
      successLog(`Password updated for ${table}: ${username}`);
      return { success: true };
    }
    
  } catch (error) {
    let ErrorMsg = error.message;
    errorLog(ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}


// Function to update a table in the db
async function updateDB(table, id, jsonDict, containerName) {  // jsonDict = { column:value, .. }
  containerName = (containerName) ? containerName : DMS_CONTAINER;
  debugLog(`${id} in ${table} with`, jsonDict);

  try {
    if (!updateValidKeys[table]) {
      throw new Error(`unknown table ${table}`);
    }
    
    if (Object.keys(jsonDict).length = 0) {
      throw new Error('nothing to modify was passed');
    }
    
    let validDict = reduxPropertiesOfObj(jsonDict, Object.keys(updateValidKeys[table]));
    if (Object.keys(validDict).length = 0) {
      throw new Error('jsonDict is invalid');
    }
    
    // for each new value to update...
    for (const [key, value] of Object.entries(validDict)) {
      
      // is the value the right type...
      if (typeof value == updateValidKeys[table][key]) {
        
        // password has its own function
        if (key == 'password') {
          changePassword(id, value, containerName);
          
        // objects must be saved as JSON
        } else if (typeof value == 'object') {
          dbRun(sql[table].update[key], {[key]:JSON.stringify(value)}, id);
          successLog(`Updated ${table} ${id} with ${key}=`, value);
        
        // other sqlite3 valid types
        } else {
          dbRun(sql[table].update[key], {[key]:value}, id);
          successLog(`Updated ${table} ${id} with ${key}=${value}`);
        }
        
      } else errorLog(`typeof ${value} for ${key} is not ${updateValidKeys[table][key]}`)
    }
    return { success: true };
    
  } catch (error) {
    let ErrorMsg = error.message;
    errorLog(ErrorMsg);
    throw new Error(ErrorMsg);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
}

module.exports = {
  DB,
  sql,
  dbOpen,
  dbInit,
  dbUpdate,
  dbRun,
  dbGet,
  dbAll,
  hashPassword,
  verifyPassword,
  changePassword,
  updateDB,
};


// debug = true;
// containerName = 'dms';
// DB = require('better-sqlite3')(DATABASE);
// DMSGUI_CONFIG_PATH   = process.env.DMSGUI_CONFIG_PATH || '/app/config';
// DATABASE      = DMSGUI_CONFIG_PATH + '/dms-gui.sqlite3';
// function dbOpen() {DB = require('better-sqlite3')(DATABASE);}
// function debugLog(message) {console.debug(message)}
// function errorLog(message) {console.debug(message)}

// DB = require('better-sqlite3')(DATABASE);
// DB.pragma('journal_mode = WAL');
// process.on('exit', () => DB.close());
// DMSGUI_VERSION = (process.env.DMSGUI_VERSION.split("v").length == 2) ? process.env.DMSGUI_VERSION.split("v")[1] : process.env.DMSGUI_VERSION;
// sql=`BEGIN TRANSACTION;
          // CREATE TABLE IF NOT EXISTS logins (
          // username  TEXT NOT NULL UNIQUE PRIMARY KEY,
          // salt      TEXT NOT NULL,
          // hash      TEXT NOT NULL,
          // email     TEXT DEFAULT ''
          // );
          // REPLACE INTO envs VALUES ('DB_VERSION_logins', '${DMSGUI_VERSION}');
          // COMMIT;`
// DB.prepare('SELECT username, email from logins').all()
// DB.exec(sql)
// DB.inTransaction
// DB.open
// DB.close()

// dbRun(sql)

// insert = DB.prepare(`REPLACE INTO settings (name, value) VALUES (@name, @value)`)
// insert.run({name:'node',value:'v24'})  // { changes: 1, lastInsertRowid: 1 }

// insert = DB.prepare(`REPLACE INTO settings               VALUES (?, ?)`)
// insert.run(['node2','v26'])            // { changes: 1, lastInsertRowid: 2 }

// key = 'isAdmin'
// value = 1
// username = 'admin2'

// sql = { logins: { update: { any: `UPDATE logins set {@key}=? WHERE username = ?`, } } }
// sql = { logins: { update: { any: `REPLACE INTO logins (username, salt, hash, email, isAdmin) VALUES (@username, @salt, @hash, @email, @isAdmin)`, } } }
// dbRun(sql.logins.update.any, key, value, username)

// sql = { logins: { update: { isAdmin: `UPDATE logins set isAdmin = @isAdmin WHERE username = ?`, } } }
// dbRun(sql.logins.update.isAdmin, {isAdmin:value}, username) // works

// dbRun(`REPLACE INTO roles (username, mailbox, scope) VALUES (@username, @mailbox, ?)`, [{username:'user2',mailbox:'ops@doctusit.com'},{username:'user2',mailbox:'admin@doctusit.com'}], containerName )
// dbAll(`SELECT username, mailbox from roles WHERE 1=1 AND scope = ?`, containerName)

// dbAll(`SELECT r.username, a.mailbox FROM accounts a LEFT JOIN roles r ON r.mailbox   = a.mailbox  WHERE 1=1 AND a.scope=r.scope AND a.scope = ?`, containerName)
  // { username: 'user2', mailbox: 'ops@doctusit.com' },
  // { username: 'user2', mailbox: 'admin@doctusit.com' }

// dbAll(`SELECT l.username, r.mailbox FROM logins l   LEFT JOIN roles r ON r.username  = l.username WHERE 1=1 AND r.scope = ?`, containerName)

