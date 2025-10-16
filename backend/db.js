require('./env.js');
const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('./backend.js');

var DB;

// in-memory database: https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#serializeoptions---buffer
// const buffer = DB.serialize();
// DB.close();
// DB = new Database(buffer);

// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#transactionfunction---function
// BEWARE: 
sql = {
infos: {

  select: {
    all:    `SELECT * from infos`,
    value:  `SELECT value from infos where name = ?`,
  },
  
  insert: {
    values: `REPLACE INTO infos (name, value) VALUES (@name, @value)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE infos (
          name  TEXT NOT NULL UNIQUE PRIMARY KEY,
          value TEXT NOT NULL
          );
          INSERT INTO infos (name, value) VALUES ('DB_VERSION_infos', '${DMSGUI_VERSION}');
          COMMIT;`,
},

settings: {

  select: {
    all:    `SELECT * from settings`,
    value:  `SELECT value from settings where name = ?`,
  },
  
  insert: {
    values: `REPLACE INTO settings (name, value) VALUES (@name, @value)`,
  },
  
  init:   `BEGIN TRANSACTION;
          CREATE TABLE settings (
          name  TEXT NOT NULL UNIQUE PRIMARY KEY,
          value TEXT NOT NULL
          );
          INSERT INTO infos (name, value) VALUES ('DB_VERSION_settings', '${DMSGUI_VERSION}');
          COMMIT;`,
},

logins: {
      
  select: {
    all:      `SELECT username from logins`,
    username: `SELECT username from logins where username = ?`,
    logins:   `SELECT username, email from logins`,
    login:    `SELECT username, email from logins where username = ?`,
    salt:     `SELECT salt from logins where username = ?`,
    hash:     `SELECT hash from logins where username = ?`,
    saltHash: `SELECT salt, hash FROM logins WHERE username = ?`,
  },
  
  insert: {
    login: `REPLACE INTO logins (username, salt, hash, email) VALUES (@username, @salt, @hash, @email)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE logins (
          username  TEXT NOT NULL UNIQUE PRIMARY KEY,
          salt      TEXT NOT NULL,
          hash      TEXT NOT NULL,
          email     TEXT DEFAULT ''
          );
          INSERT INTO infos (name, value) VALUES ('DB_VERSION_logins', '${DMSGUI_VERSION}');
          COMMIT;`,
          
  patch: [
    { DB_VERSION: '1.0.14',
      code:`BEGIN TRANSACTION;
            ALTER TABLE logins DROP COLUMN password;
            ALTER TABLE logins ADD salt TEXT DEFAULT '';
            ALTER TABLE logins ADD hash TEXT DEFAULT '';
            REPLACE INTO infos (name, value)  VALUES ('DB_VERSION_logins', '1.0.14');
            COMMIT;`
    },
  ],
},
};

// insert = DB.prepare(`REPLACE INTO settings (name, value) VALUES (@name, @value)`)
// insert.run({name:'node',value:'v24'})  // { changes: 1, lastInsertRowid: 1 }

// insert = DB.prepare(`REPLACE INTO settings               VALUES (?, ?)`)
// insert.run(['node2','v26'])            // { changes: 1, lastInsertRowid: 2 }

  // debug = true;
  // CONFIG_PATH   = process.env.CONFIG_PATH || '/app/config';
  // DATABASE      = CONFIG_PATH + '/dms-gui.sqlite3';
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
            // REPLACE INTO infos VALUES ('DB_VERSION_logins', '${DMSGUI_VERSION}');
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


function dbRun(sql, params={}) {

  if (typeof sql != "string") throw new Error("Error: sql argument must be a string");
  try {
    
    // multiple statements
    if (sql.match(/BEGIN TRANSACTION/i)) {
      debugLog(`DB.exec(${sql})`);
      DB.exec(sql);
      debugLog(`DB.exec success`);

    // single statement
    } else {
      debugLog(`DB.prepare(${sql}).run(${JSON.stringify(params)})`);
      DB.prepare(sql).run(params);
      debugLog(`DB.run success`);
    }
    // result = { changes: 0, lastInsertRowid: 0 }

  } catch (err) {
    debugLog(`${err.code}: ${err.message}`);
    dbOpen()
    throw err;
    // dupe insert:
      // err.code=SQLITE_CONSTRAINT_PRIMARYKEY
      // err.message=UNIQUE constraint failed: settings.name
    // missing table or exec failed:
      // err.code=SQLITE_ERROR
      // err.message=no such table: master
  }
}

function dbGet(sql, params=[]) {
  
  if (typeof sql != "string") throw new Error("Error: sql argument must be a string");
  try {
    debugLog(`DB.prepare(${sql}).get(${JSON.stringify(params)})`);
    const result = DB.prepare(sql).get(params);
    debugLog(`success`, result);
    return (result) ? result : {};
    // result = { name: 'node', value: 'v24' } or { value: 'v24' } orundefined

  } catch (err) {
    errorLog(`${err.code}: ${err.message}`);
    dbOpen();
    throw err;
  }
}

function dbAll(sql, params=[]) {
  
  if (typeof sql != "string") throw new Error("Error: sql argument must be a string");
  try {
    debugLog(`DB.prepare(${sql}).all(${JSON.stringify(params)})`);
    const result = DB.prepare(sql).all(params);
    debugLog(`success:`, result);
    return (result) ? result : [];
    // result = [ { name: 'node', value: 'v24' }, { name: 'node2', value: 'v27' } ] or []

  } catch (err) {
    errorLog(`${err.code}: ${err.message}`);
    dbOpen();
    throw err;
  }
}

function dbInit() {

  let result;
  try {
    dbOpen();
  } catch (err) {
    errorLog(`${err.code}: ${err.message}`);
    throw err;
  }

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
        } else warnLog(`${table}: ${err.message}`);
      }
    }
  }

  try {
    dbUpdate();
  } catch (err) {
    errorLog(`${err.code}: ${err.message}`);
    throw err;
  }

}


function dbUpdate() {
  let db_version;
  
  for (const [table, actions] of Object.entries(sql)) {
    try {
      db_version = dbGet(sql.infos.select.value, `DB_VERSION_${table}`);
      db_version = (db_version) ? db_version.value : undefined;
      debugLog(`${table}: db_version=`, db_version);
    } catch (err) {
      errorLog(`${table}: db_version= ${err.code}: ${err.message}`);
      throw err;
    }
    // now check if we need patches for that table
    // 0: version strings are equal
    // 1: version a is greater than b
    // -1:version b is greater than a
    
    // now check is there are any patches
    if (actions.patch && actions.patch.length) {
      // now check is patches ar needed
      if (!db_version || db_version.localeCompare(DMSGUI_VERSION, undefined, { numeric: true, sensitivity: 'base' }) == -1) {
      
      // now check each patch if we need it
        for (const [key, patch] of Object.entries(actions.patch)) {
          // if patch version > current db_version then run it
          if (!db_version || db_version.localeCompare(patch.DB_VERSION, undefined, { numeric: true, sensitivity: 'base' }) == -1) {
            try {
              dbRun(patch.code);
              successLog(`${table}: patch from ${db_version} to ${patch.DB_VERSION}: success`);
              db_version = patch.DB_VERSION;
            } catch (err) {
              errorLog(`${table}: patch from ${db_version} to ${patch.DB_VERSION}: ${err.code}: ${err.message}`);
              throw err;
            }
          }
        }
      }
    }

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
};
