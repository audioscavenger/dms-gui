require('./env.js');

const DB = require('better-sqlite3')(DATABASE);
// const Database = require('better-sqlite3');
// const DB = new Database('foobar.db', { verbose: console.log });
DB.pragma('journal_mode = WAL');
// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#close---this
process.on('exit', () => DB.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

// in-memory database: https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#serializeoptions---buffer
// const buffer = DB.serialize();
// DB.close();
// DB = new Database(buffer);

// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#transactionfunction---function
const sql = {
settings: {

  
  select: {
    all: `SELECT * from settings`,
    value: `SELECT value from settings where name = ?`,
  },
  
  insert: {
    values: `REPLACE INTO settings VALUES (@name, @value)`,
  },
  
  init: `
    CREATE TABLE IF NOT EXISTS settings (
      name  TEXT NOT NULL UNIQUE PRIMARY KEY,
      value TEXT NOT NULL
      )`,
},

logins: {
      
  select: {
    all: `SELECT username from logins`,
    username: `SELECT username from logins where username = ?`,
    salt: `SELECT salt from logins where username = ?`,
    hash: `SELECT hash from logins where username = ?`,
    saltHash: `SELECT salt, hash FROM logins WHERE username = ?`,
  },
  
  insert: {
    login: `REPLACE INTO logins VALUES (@username, @salt, @hash, @email)`,
  },
  
  init: `
    CREATE TABLE IF NOT EXISTS logins (
      username  TEXT NOT NULL UNIQUE PRIMARY KEY,
      password  TEXT NOT NULL,
      email     TEXT
      )`,
},
};

// insert = DB.prepare(`REPLACE INTO settings (name, value) VALUES (@name, @value)`)
// insert.run({name:'node',value:'v24'})  // { changes: 1, lastInsertRowid: 1 }

// insert = DB.prepare(`REPLACE INTO settings               VALUES (?, ?)`)
// insert.run(['node2','v26'])            // { changes: 1, lastInsertRowid: 2 }


function dbRun(sql, params={}) {
  try {
    debugLog(`DB.prepare(${sql}).run(${params})`);
    const result = DB.prepare(sql).run(params);
    debugLog('result',result);
    return result;
    // result = { changes: 0, lastInsertRowid: 0 }

  } catch (err) {
    if (!DB.inTransaction) {
      console.error(`dbRun error: ${err.code}: ${err.message}`);
        // dupe insert:
          // err.code=SQLITE_CONSTRAINT_PRIMARYKEY
          // err.message=UNIQUE constraint failed: settings.name
        // missing table:
          // err.code=SQLITE_ERROR
          // err.message=no such table: master
      throw err;
    }
  }
}

function dbGet(sql, params=[]) {
  try {
    debugLog(`DB.prepare(${sql}).get(${params})`);
    const result = DB.prepare(sql).get(params);
    debugLog('result',result);
    return result;
    // result = { name: 'node', value: 'v24' } or undefined

  } catch (err) {
    if (!DB.inTransaction) {
      console.error(`dbRun error: ${err.code}: ${err.message}`);
      throw err;
    }
  }
}

function dbAll(sql, params=[]) {
  try {
    debugLog(`DB.prepare(${sql}).get(${params})`);
    const result = DB.prepare(sql).get(params);
    debugLog('result',result);
    return result;
    // result = [ { name: 'node', value: 'v24' }, { name: 'node2', value: 'v27' } ] or []

  } catch (err) {
    if (!DB.inTransaction) {
      console.error(`dbRun error: ${err.code}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = {
  sql,
  dbRun,
  dbGet,
  dbAll,
};
