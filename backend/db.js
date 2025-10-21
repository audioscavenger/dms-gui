require('./env.js');
const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('./backend.js');

const crypto = require('node:crypto');

var DB;

// in-memory database: https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#serializeoptions---buffer
// const buffer = DB.serialize();
// DB.close();
// DB = new Database(buffer);

// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#transactionfunction---function
// BEWARE: 
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
        `ALTER TABLE settings ADD scope TEXT DEFAULT NULL`,
        `ALTER TABLE settings ADD isMutable BIT DEFAULT ${isImmutable}`,
        `REPLACE INTO settings (name, value, scope, isMutable)  VALUES ('DB_VERSION_settings', '1.0.17', 'dms-gui', ${isImmutable})`,
      ],
    },
  ],
},

logins: {
      
  select: {
    usernames:`SELECT username from logins`,
    username: `SELECT username from logins WHERE username = ?`,
    logins:   `SELECT username, email from logins`,
    login:    `SELECT username, email from logins WHERE username = ?`,
    salt:     `SELECT salt from logins WHERE username = ?`,
    hash:     `SELECT hash from logins WHERE username = ?`,
    saltHash: `SELECT salt, hash FROM logins WHERE username = ?`,
  },
  
  insert: {
    login: `REPLACE INTO logins (username, salt, hash, email) VALUES (@username, @salt, @hash, @email)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE logins (
          username  TEXT NOT NULL UNIQUE PRIMARY KEY,
          salt      TEXT DEFAULT '',
          hash      TEXT DEFAULT '',
          email     TEXT DEFAULT ''
          );
          INSERT OR IGNORE INTO logins (username, salt, hash) VALUES ('admin', 'fdebebcdcec4e534757a49473759355b', 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18');
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
        `ALTER TABLE logins ADD salt TEXT NOT NULL DEFAULT ''`,
        `ALTER TABLE logins ADD hash TEXT NOT NULL DEFAULT ''`,
        `INSERT OR IGNORE INTO logins (username, salt, hash) VALUES ('admin', 'fdebebcdcec4e534757a49473759355b', 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18')`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.1.1', 'dms-gui', ${isImmutable})`,
      ],
    },
  ],
},

accounts: {
      
  select: {
    accounts: `SELECT email, domain, storage FROM accounts`,
    account:  `SELECT email FROM accounts WHERE email = ?`,
    byDomain: `SELECT email FROM accounts WHERE domain = ?`,
  },
  
  insert: {
    account:  `REPLACE INTO accounts (email, domain, storage) VALUES (@email, @domain, @storage)`,
  },
  
  delete: {
    account:  `DELETE FROM accounts WHERE email = ?`,
    accounts: `DELETE FROM accounts`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE accounts (
          email     TEXT NOT NULL UNIQUE PRIMARY KEY,
          salt      TEXT DEFAULT '',
          hash      TEXT DEFAULT '',
          domain    TEXT DEFAULT '',
          storage   TEXT DEFAULT '{}'
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_accounts', '${DMSGUI_VERSION}', 'dms-gui', ${isImmutable});
          COMMIT;`,
},

domains: {
      
  select: {
    domains:  `SELECT * FROM domains`,
    domain:   `SELECT * FROM domains WHERE domain = ?`,
    dkims:    `SELECT DISTINCT dkim FROM domains`,
    dkim:     `SELECT dkim FROM domains WHERE domain = ?`,
  },
  
  insert: {
    domain:   `REPLACE INTO domains (domain, dkim, keytype, keysize, path) VALUES (@domain, @dkim, @keytype, @keysize, @path)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE domains (
          domain    TEXT NOT NULL UNIQUE PRIMARY KEY,
          dkim      TEXT DEFAULT '${DKIM_SELECTOR_DEFAULT}',
          keytype   TEXT DEFAULT 'rsa',
          keysize   TEXT DEFAULT '2048',
          path      TEXT DEFAULT '${DMS_CONFIG_PATH}/rspamd/dkim/${DKIM_KEYTYPE_DEFAULT}-${DKIM_KEYSIZE_DEFAULT}-${DKIM_SELECTOR_DEFAULT}-$domain.private.txt'
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
  ],
},

};

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

// insert = DB.prepare(`REPLACE INTO settings (name, value) VALUES (@name, @value)`)
// insert.run({name:'node',value:'v24'})  // { changes: 1, lastInsertRowid: 1 }

// insert = DB.prepare(`REPLACE INTO settings               VALUES (?, ?)`)
// insert.run(['node2','v26'])            // { changes: 1, lastInsertRowid: 2 }

  // debug = true;
  // DMSGUI_CONFIG_PATH   = process.env.DMSGUI_CONFIG_PATH || '/app/config';
  // DATABASE      = DMSGUI_CONFIG_PATH + '/dms-gui.sqlite3';
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
  // function debugLog(message) {console.debug(message)}
  // dbRun(sql)


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
// dbRun takes multiple anonymous parameters anonParams for WHERE clause value(s) when needed: can be multiple strings or an array, anonParams becomes an array anyways
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
    } else if (Array.isArray(params) && params.length > 1) {
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
  }
}

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
};
