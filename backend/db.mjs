import {
  getValueFromArrayOfObj,
  reduxPropertiesOfObj,
} from '../common.mjs';
import {
  debugLog,
  errorLog,
  execSetup,
  infoLog,
  successLog
} from './backend.mjs';
import {
  env,
  live
} from './env.mjs';

import Database from 'better-sqlite3';
import crypto from 'node:crypto';

var DB;

// rsa-2048-dkim-$domain.private.txt
// keytypes = ['rsa','ed25519']
// keysizes = ['1024','2048']

export const sqlMatch = {
  add: {
    patch: /ALTER[\s]+TABLE[\s]+[\"]?[\w]+[\"]?[\s]+ADD[\s]+[\"]?(\w+)[\"]?/i,
    error:  /duplicate[\s]+column[\s]+name:[\s]+[\"]?(\w+)[\"]?/i,
  },
  drop: {
    patch: /DROP[\s]+COLUMN[\s]+[\"]?(\w+)[\";]?/i,
    error:  /no[\s]+such[\s]+column[:\s]+[\"]?(\w+)[\"]?/i,
  },
  get: {
    error:  /no[\s]+such[\s]+column[:\s]+[\"]?(\w+)[\"]?/i,
  },
}


// https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#transactionfunction---function

// in-memory database: https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#serializeoptions---buffer
// const buffer = DB.serialize();
// DB.close();
// DB = new Database(buffer);

export const sql = {
settings: {

  scope:  true,
  select: {
    count:    `SELECT COUNT(*) count from settings WHERE 1=1 AND isMutable = ${env.isMutable}`,
    settings: `SELECT name, value from settings WHERE 1=1 AND isMutable = ${env.isMutable} AND scope = @scope`,
    setting:  `SELECT value       from settings WHERE 1=1 AND isMutable = ${env.isMutable} AND scope = @scope AND name = ?`,
    envs:     `SELECT name, value from settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope`,
    env:      `SELECT value       from settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope AND name = ?`,
    scopes:   `SELECT DISTINCT value from settings WHERE 1=1 AND isMutable = ${env.isMutable} AND name = 'containerName' AND scope NOT IN (SELECT DISTINCT id from logins)`,
  },
  
  insert: {
    setting:  `REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, @scope, 1)`,
    env:      `REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, @scope, 0)`,
  },
  
  delete: {
    envs:     `DELETE from settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope`,
    env:      `DELETE from settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope AND name = ?`,
  },
  
  init:   `BEGIN TRANSACTION;
          CREATE  TABLE settings (
          id      INTEGER PRIMARY KEY,
          name    TEXT NOT NULL,
          value   TEXT NOT NULL,
          scope   TEXT NOT NULL,
          isMutable BIT DEFAULT ${env.isImmutable},
          UNIQUE (name, scope)
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_settings', '${env.DMSGUI_VERSION}', 'dms-gui', ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.0.17',
      patches: [
        `ALTER TABLE settings ADD scope TEXT NOT NULL`,
        `ALTER TABLE settings ADD isMutable BIT DEFAULT ${env.isImmutable}`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_settings', '1.0.17', 'dms-gui', ${env.isImmutable})`,
      ],
    },
    { DB_VERSION: '1.2.4',
      patches: [
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('containerName', '${live.DMS_CONTAINER}', '${live.DMS_CONTAINER}', ${env.isMutable})`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('setupPath', '${env.DMS_SETUP_SCRIPT}', '${live.DMS_CONTAINER}', ${env.isMutable})`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('env.DMS_CONFIG_PATH', '${env.DMS_CONFIG_PATH}', '${live.DMS_CONTAINER}', ${env.isMutable})`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_settings', '1.2.4', 'dms-gui', ${env.isImmutable})`,
      ],
    },
  ],
},

logins: {
      
  keys:   {password:'string', email:'string', username:'string', isAdmin:'number', isActive:'number', isAccount:'number', roles:'object'},
  scope:  false,
  select: {
    count:    `SELECT COUNT(*) count from logins`,
    login:    `SELECT email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND (email = @email OR username = @username)`,
    logins:   `SELECT id, email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1`,
    admins:   `SELECT id, email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND isAdmin = 1`,
    roles:    `SELECT roles from logins WHERE 1=1 AND (email = @email OR username = @username)`,
    salt:     `SELECT salt from logins WHERE email = ?`,
    hash:     `SELECT hash from logins WHERE email = ?`,
    saltHash: `SELECT salt, hash FROM logins WHERE (email = @email OR username = @username)`,
    isActive: {
      login:    `SELECT email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND isActive = 1 AND (email = @email OR username = @username)`,
      logins:   `SELECT id, email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND isActive = 1`,
      admins:   `SELECT id, email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1`,
      roles:    `SELECT roles from logins WHERE 1=1 AND isActive = 1 AND (email = @email OR username = @username)`,
      count: {
        admins:   `SELECT COUNT(*) count from logins WHERE 1=1 AND isActive = 0 AND isAdmin = 1`,
      },
    },
    isInactive: {
      login:    `SELECT email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND isActive = 0 AND (email = @email OR username = @username)`,
      logins:   `SELECT id, email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND isActive = 0`,
      admins:   `SELECT id, email, username, isAdmin, isActive, isAccount, roles from logins WHERE 1=1 AND isActive = 0 AND isAdmin = 1`,
      roles:    `SELECT roles from logins WHERE 1=1 AND isActive = 0 AND (email = @email OR username = @username)`,
    },
  },
  
  insert: {
    login:    `REPLACE INTO logins          (email, username, salt, hash, isAdmin, isAccount, isActive, roles) VALUES (@email, @username, @salt, @hash, @isAdmin, @isAccount, @isActive, @roles)`,
    fromDMS:  `INSERT OR IGNORE INTO logins (email, username, isAccount, roles) VALUES (@email, @username, @isAccount, @roles)`,
  },
  
  update: {
    email: {
      undefined: {
        desc:   "allow to change a login's email only if isAdmin or not isAccount",
        test:   `SELECT COUNT(email) count from logins WHERE 1=1 AND (isAdmin = 1 OR isAccount = 0) AND email = ?`,
        check:  function(result) { return result.count == 1; },
        pass:   `UPDATE logins set email = @email WHERE email = ?`,
        fail:   "Cannot change email from a mailbox-linked user.",
      },
    },
    username: `UPDATE logins set username = @username WHERE email = ?`,
    password: `UPDATE logins set salt=@salt, hash=@hash WHERE email = ?`,
    isAdmin: {
      0: {
        desc:   "refuse to demote the last admin",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1 AND email IS NOT ?`,
        check:  function(result) { return result.count > 0; },
        pass:   `UPDATE logins set isAdmin = @isAdmin WHERE email = ?`,
        fail:   "Cannot demote the last admin, how will you administer dms-gui?",
      },
      1: {
        desc:   "not a test, just flipping login to isAdmin also flips isAccount to 0",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND email = ?`,
        check:  function(result) { return true; },
        pass:   `UPDATE logins set isAdmin = @isAdmin, isAccount = 0 WHERE email = ?`,
        fail:   "Cannot demote the last admin, how will you administer dms-gui?",
      },
    },
    isActive: {
      0: {
        desc:   "refuse to deactivate the last admin",
        test:   `SELECT COUNT(isActive) count from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1 AND email IS NOT ?`,
        check:  function(result) { return result.count > 0; },
        pass:   `UPDATE logins set isActive = @isActive WHERE email = ?`,
        fail:   "Cannot deactivate the last admin, how will you administer dms-gui?",
      },
      undefined: {
        desc:   "no test",
        test:   `SELECT COUNT(isActive) count from logins WHERE 1=1 AND email = ?`,
        check:  function(result) { return true; },
        pass:   `UPDATE logins set isActive = @isActive WHERE email = ?`,
      },
    },
    isAccount: {
      0: {
        desc:   "refuse to be isAccount when isAdmin",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND isAdmin = 1 AND email = ?`,
        check:  function(result) { return result.count == 0; },
        pass:   `UPDATE logins set isAccount = @isAccount WHERE email = ?`,
        fail:   "Cannot make an admin also a linked account, it's one or the other",
      },
      1: {
        desc:   "not a test, just flipping login to isAccount also flips isAdmin to 0",
        test:   `SELECT COUNT(isAccount) count from logins WHERE 1=1 AND email = ?`,
        check:  function(result) { return true; },
        pass:   `UPDATE logins set isAccount = @isAccount, isAdmin = 0 WHERE email = ?`,
      },
    },
    roles:    `UPDATE logins set roles = @roles WHERE email = ?`,
  },
  
  delete: {
    email: {
      undefined: {
        desc:   "refuse to delete last admin",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND isAdmin = 1 AND email IS NOT ?`,
        check:  function(result) { return result.count > 0; },
        pass:   `DELETE from logins WHERE 1=1 AND email = ?`,
        fail:   "Cannot delete the last admin, how will you administer dms-gui?",
      },
    },
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE logins (
          id        INTEGER PRIMARY KEY,
          email     TEXT NOT NULL UNIQUE,
          username  TEXT NOT NULL UNIQUE,
          salt      TEXT DEFAULT '',
          hash      TEXT DEFAULT '',
          isAdmin   BIT DEFAULT 0,
          isActive  BIT DEFAULT 1,
          isAccount BIT DEFAULT 0,
          roles     TEXT DEFAULT '[]'
          );
          INSERT OR IGNORE INTO logins (email, username, salt, hash, isAdmin, isActive, isAccount, roles) VALUES ('admin@dms-gui.com', 'admin', 'fdebebcdcec4e534757a49473759355b', 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18', 1, 1, 0, '[]');
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '${env.DMSGUI_VERSION}', 'dms-gui', ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.0.14',
      patches: [
        `ALTER TABLE logins DROP COLUMN password;`,
        `ALTER TABLE logins ADD salt TEXT DEFAULT ''`,
        `ALTER TABLE logins ADD hash TEXT DEFAULT ''`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.0.14', 'dms-gui', ${env.isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.1',
      patches: [
        `ALTER TABLE logins DROP COLUMN password;`,
        `ALTER TABLE logins ADD salt TEXT DEFAULT ''`,
        `ALTER TABLE logins ADD hash TEXT DEFAULT ''`,
        `INSERT OR IGNORE INTO logins (email, username, salt, hash) VALUES ('admin@dms-gui.com', 'admin', 'fdebebcdcec4e534757a49473759355b', 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18')`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.1.1', 'dms-gui', ${env.isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.6',
      patches: [
        `ALTER TABLE logins ADD isAdmin    BIT DEFAULT 0`,
        `ALTER TABLE logins ADD isActive   BIT DEFAULT 1`,
        `UPDATE logins set isAdmin = 1 WHERE username = 'admin'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.1.6', 'dms-gui', ${env.isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.9',
      patches: [
        `ALTER TABLE logins ADD roles    TEXT DEFAULT '[]'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.1.9', 'dms-gui', ${env.isImmutable})`,
      ],
    },
  ],
},

roles: {
      
  scope:  true,
  select: {
    roles:    `SELECT username, mailbox from roles WHERE 1=1 AND scope = @scope`,
    username: `SELECT username        from roles WHERE 1=1 AND scope = @scope AND mailbox = ?`,
    mailbox:  `SELECT mailbox           from roles WHERE 1=1 AND scope = @scope AND username = ?`,
  },
  
  insert: {
    role:     `REPLACE INTO roles (username, mailbox, scope) VALUES (@username, @mailbox, ?)`,
  },
  
  delete: {
    all:       `DELETE from roles`,
    usernames: `DELETE from roles WHERE 1=1 AND scope = @scope AND username = ?`,
    emails:    `DELETE from roles WHERE 1=1 AND scope = @scope AND mailbox = ?`,
    role:      `DELETE from roles WHERE 1=1 AND scope = @scope AND username = ? AND mailbox = ?`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE roles (
          id        INTEGER PRIMARY KEY,
          username  TEXT NOT NULL,
          mailbox     TEXT NOT NULL,
          scope     TEXT NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_roles', '${env.DMSGUI_VERSION}', 'dms-gui', ${env.isImmutable});
          COMMIT;`,
  
},

accounts: {
      
  keys: {password:'string', storage:'object', domain:'string'},
  scope:  true,
  select: {
    count:    `SELECT COUNT(*) count from accounts WHERE 1=1 AND scope = @scope`,
    accounts: `SELECT mailbox, domain, storage FROM accounts WHERE 1=1 AND scope = @scope ORDER BY domain, mailbox`,
    mailboxes:`SELECT mailbox FROM accounts WHERE 1=1 AND scope = @scope`,
    mailbox:  `SELECT mailbox FROM accounts WHERE 1=1 AND scope = @scope AND mailbox = ?`,
    byDomain: `SELECT mailbox FROM accounts WHERE 1=1 AND scope = @scope AND domain = ?`,
    salt:     `SELECT salt from accounts WHERE mailbox = ?`,
    hash:     `SELECT hash from accounts WHERE mailbox = ?`,
    saltHash: `SELECT salt, hash FROM accounts WHERE (mailbox = @mailbox)`,
  },
  
  insert: {
    fromDMS:  `REPLACE INTO accounts (mailbox, domain, storage, scope) VALUES (@mailbox, @domain, @storage, @scope)`,
    fromGUI:  `REPLACE INTO accounts (mailbox, domain, salt, hash, scope) VALUES (@mailbox, @domain, @salt, @hash, @scope)`,
  },
  
  update: {
    password: `UPDATE accounts set salt=@salt, hash=@hash WHERE scope = @scope AND mailbox = ?`,
    storage:  `UPDATE accounts set storage = @storage WHERE 1=1 AND scope = @scope AND mailbox = ?`,
  },
  
  delete: {
    mailbox:  `DELETE FROM accounts WHERE 1=1 AND scope = @scope AND mailbox = ?`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE accounts (
          id        INTEGER PRIMARY KEY,
          mailbox   TEXT NOT NULL,
          domain    TEXT DEFAULT '',
          salt      TEXT DEFAULT '',
          hash      TEXT DEFAULT '',
          storage   TEXT DEFAULT '{}',
          scope     TEXT NOT NULL,
          UNIQUE (mailbox, scope)
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_accounts', '${env.DMSGUI_VERSION}', 'dms-gui', ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.1.3',
      patches: [
        `ALTER TABLE accounts ADD scope   TEXT DEFAULT '${live.DMS_CONTAINER}'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_accounts', '1.1.3', 'dms-gui', ${env.isImmutable})`,
      ],
    },
  ],
},

aliases: {
      
  keys: {source:'string', destination:'string', regex:'number'},
  scope:  true,
  select: {
    count:    `SELECT COUNT(*) count from aliases WHERE 1=1 AND scope = @scope`,
    aliases:  `SELECT source, destination, regex FROM aliases WHERE 1=1 AND scope = @scope`,
    bySource: `SELECT destination FROM aliases WHERE 1=1 AND scope = @scope AND source = ?`,
    byDest:   `SELECT source      FROM aliases WHERE 1=1 AND scope = @scope AND destination = ?`,
    regexes:  `SELECT source, destination FROM aliases WHERE 1=1 AND regex = 1 AND scope = @scope`,
  },
  
  insert: {
    alias:    `REPLACE INTO aliases (source, destination, regex, scope) VALUES (@source, @destination, @regex, @scope)`,
  },
  
  delete: {
    bySource: `DELETE FROM aliases WHERE 1=1 AND scope = @scope AND source = ?`,
    byDest:   `DELETE FROM aliases WHERE 1=1 AND scope = @scope AND destination = ?`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE aliases (
          id          INTEGER PRIMARY KEY,
          source      TEXT NOT NULL,
          destination TEXT NOT NULL,
          regex       BIT DEFAULT 0,
          scope       NOT NULL,
          UNIQUE (source, scope)
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_aliases', '${env.DMSGUI_VERSION}', 'dms-gui', ${env.isImmutable});
          COMMIT;`,
  
},

domains: {
      
  keys: {dkim:'string', keytype:'string', keysize:'string', path:'string'},
  scope:  true,
  select: {
    count:    `SELECT COUNT(*) count FROM domains WHERE 1=1 AND scope = @scope`,
    domains:  `SELECT * FROM domains WHERE 1=1 AND scope = @scope`,
    domain:   `SELECT * FROM domains WHERE 1=1 AND scope = @scope AND domain = ?`,
    dkims:    `SELECT DISTINCT dkim FROM domains WHERE 1=1 AND scope = @scope`,
    dkim:     `SELECT dkim FROM domains WHERE 1=1 AND scope = @scope AND domain = ?`,
  },
  
  insert: {
    domain:   `REPLACE INTO domains (domain, dkim, keytype, keysize, path, scope) VALUES (@domain, @dkim, @keytype, @keysize, @path, @scope)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE domains (
          id        INTEGER PRIMARY KEY,
          domain    TEXT NOT NULL UNIQUE,
          dkim      TEXT DEFAULT '${env.DKIM_SELECTOR_DEFAULT}',
          keytype   TEXT DEFAULT 'rsa',
          keysize   TEXT DEFAULT '2048',
          path      TEXT DEFAULT '${env.DMS_CONFIG_PATH}/rspamd/dkim/${env.DKIM_KEYTYPE_DEFAULT}-${env.DKIM_KEYSIZE_DEFAULT}-${env.DKIM_SELECTOR_DEFAULT}-$domain.private.txt',
          scope     TEXT NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '${env.DMSGUI_VERSION}', 'dms-gui', ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.1.2',
      patches: [
        `ALTER TABLE domains ADD keytype TEXT DEFAULT 'rsa'`,
        `ALTER TABLE domains ADD keysize TEXT DEFAULT '2048'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '1.1.2', 'dms-gui', ${env.isImmutable})`,
      ],
    },
    { DB_VERSION: '1.1.3',
      patches: [
        `ALTER TABLE domains ADD scope   TEXT DEFAULT '${live.DMS_CONTAINER}'`,
        `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '1.1.3', 'dms-gui', ${env.isImmutable})`,
      ],
    },
  ],
},

};
// password: `REPLACE INTO accounts (mailbox, salt, hash, scope) VALUES (@mailbox, @salt, @hash, ?)`,


export const dbOpen = () => {
  try {
    if (DB && DB.inTransaction) DB.close();
    
    if (!DB || !DB.open) {
      // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#close---this
      // DB = new Database(env.DATABASE, { verbose: console.debug });
      DB = new Database(env.DATABASE);
      DB.pragma('journal_mode = WAL');

      // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#close---this
      process.on('exit', () => DB.close());
      process.on('SIGHUP', () => process.exit(128 + 1));
      process.on('SIGINT', () => process.exit(128 + 2));
      process.on('SIGTERM', () => process.exit(128 + 15));
      
      return DB;
    }
  } catch (error) {
    errorLog(`dbOpen error: ${error.code}: ${error.message}`);
    throw error;
  }
};

// password: `REPLACE INTO accounts (mailbox, salt, hash, scope) VALUES (@mailbox, @salt, @hash, ?)`,

// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#binding-parameters
// dbRun takes params as Array = multiple inserts or String/Object = single insert
// dbRun takes multiple anonymous parameters anonParams as an array of strings, for WHERE clause value(s) when needed
export const dbRun = (sql, params={}, ...anonParams) => {

  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=",sql);
  }
  
  let result, insertMany;
  try {
    
    // exec https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#execstring---this
    if (sql.match(/BEGIN TRANSACTION/i)) {
      debugLog(`DB.exec(${sql})`);
      result = DB.exec(sql);
      debugLog(`DB.exec success`);

    // multiple inserts at once: DB.transaction https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function
    } else if (Array.isArray(params) && params.length) {
      
      if (anonParams.length) {
        debugLog(`DB.transaction("${sql}").run(${anonParams}, ${JSON.stringify(params)})`);
        insertMany = DB.transaction((params) => {
          for (const param of params) DB.prepare(sql).run(anonParams, param);
        });
        result = insertMany(params);
        
      } else {
        debugLog(`DB.transaction("${sql}").run(${JSON.stringify(params)})`);
        insertMany = DB.transaction((params) => {
          for (const param of params) DB.prepare(sql).run(param);
        });
        result = insertMany(params);
      }
      debugLog(`DB.transaction success`);
      
    // single statement: DB.prepare https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#runbindparameters---object
    } else {
      if (anonParams.length) {
        debugLog(`DB.prepare("${sql}").run(${anonParams}, ${JSON.stringify(params)})`);
        result = DB.prepare(sql).run(params,anonParams);
        
      } else {
        debugLog(`DB.prepare("${sql}").run(${JSON.stringify(params)})`);
        result = DB.prepare(sql).run(params);
      }
      debugLog(`DB.prepare success`);
    }
    return {success: true, message: result};
    // result = { changes: 0, lastInsertRowid: 0 }

  } catch (error) {
    infoLog(`${error.code}: ${error.message}`);
    dbOpen()
    return {success: false, message: error.message}
    // throw error;
  }
};

// dupe table:
// error.code=SQLITE_ERROR
// error.message=table xyz already exists
// dupe insert:
// error.code=SQLITE_CONSTRAINT_PRIMARYKEY
// error.message=UNIQUE constraint failed: settings.name
// missing table:
// error.code=SQLITE_ERROR
// error.message=no such table: master
// drop column that does not exist:
// error.code=SQLITE_ERROR
// error.message=no such column: "password"
// add column that exists:
// error.code=SQLITE_ERROR
// error.message=duplicate column name: salt


export const dbCount = (table, containerName) => {
  
  let result;
  try {
    
    if (sql[table].scope) {
      debugLog(`DB.prepare("${sql[table].select.count}").get({scope:${containerName}})`);
      result = DB.prepare(sql[table].select.count).get({scope:containerName});
    } else {
      debugLog(`DB.prepare("${sql[table].select.count}").get()`);
      result = DB.prepare(sql[table].select.count).get();
    }
    infoLog(`success:`, result);
    
    return {success: true, message: result.count};

  } catch (error) {
    errorLog(error.message);
    dbOpen();
    return {success: false, message: error.message}
    // throw error;
  }
};

export const dbGet = (sql, params={}, ...anonParams) => {
  
  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=", sql);
  }
  
  let result;
  try {

    if (anonParams.length) {
      debugLog(`DB.prepare("${sql}").get(${JSON.stringify(params)}, ${JSON.stringify(anonParams)})`);
      result = DB.prepare(sql).get(params, anonParams);
      
    } else {
      debugLog(`DB.prepare("${sql}").get(${JSON.stringify(params)})`);
      result = DB.prepare(sql).get(params);
    }
    return {success: true, message: result};
    // result = { name: 'node', value: 'v24' } or { value: 'v24' } or undefined

  } catch (error) {
    errorLog(error.message);
    dbOpen();
    return {success: false, message: error.message}
    // throw error;
  }
};

export const dbAll = (sql, params={}, ...anonParams) => {
  
  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=",sql);
  }
  
  let result;
  try {
    if (anonParams.length) {
      debugLog(`DB.prepare("${sql}").all(${anonParams}, ${JSON.stringify(params)})`);
      result = DB.prepare(sql).all(params, anonParams);
      
    } else {
      debugLog(`DB.prepare("${sql}").all(${JSON.stringify(params)})`);
      result = DB.prepare(sql).all(params);
    }
    return {success: true, message: result};
    // result = [ { name: 'node', value: 'v24' }, { name: 'node2', value: 'v27' } ] or []

  } catch (error) {
    errorLog(error.message);
    dbOpen();
    return {success: false, message: error.message}
    // throw error;
  }
};

export const dbInit = () => {

  debugLog(`start`);
  dbOpen();

  for (const [table, actions] of Object.entries(sql)) {
    
    // init db table no matter what
    if (actions.init) {
      try {
        dbRun(actions.init);
        successLog(`${table}: success`);
        
      } catch (error) {
        if (!error.message.match(/already exists/i)) {
          errorLog(`${table}: ${error.code}: ${error.message}`);
          throw error;
        } else infoLog(`${table}: ${error.message}`);
      }
    }
  }
  DB.close()

  try {
    dbUpdate();
    
  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }
  debugLog(`end`);
};


export const dbUpdate = () => {
  debugLog(`start`);

  dbOpen();
  let result, db_version, match;
  
  for (const [table, actions] of Object.entries(sql)) {
    try {
      result = dbGet(sql.settings.select.env, {scope:'dms-gui'}, `DB_VERSION_${table}`);
      if (result.success) {
        db_version = (result.message) ? result.message.value : undefined;
        debugLog(`DB_VERSION_${table}=`, db_version);
        
      } else throw new Error(result.message);
      
    } catch (error) {
      match = {
        get: {
          error:  error.message.match(sqlMatch.get.error),
        },
      }
      
      // column does not exist or smth like that... patch needed
      if (match.get.error) {
        debugLog(`DB_VERSION_${table}= PATCH NEEDED`);
        
      } else {
        errorLog(`DB_VERSION_${table}= ${error.code}: ${error.message}`);
        throw error;
      }
    }
    
    // now check if we need patches for that table
    // 0: version strings are equal
    // 1: version a is greater than b
    // -1:version b is greater than a
    
    // first, check if there are any patches available
    if (actions.patch && actions.patch.length) {
      // now check is patches ar needed
      if (!db_version || db_version.localeCompare(env.DMSGUI_VERSION, undefined, { numeric: true, sensitivity: 'base' }) == -1) {
      
      // now check each patch array if we need it
        for (const patch of actions.patch) {
          // if patch version > current db_version then run it
          if (!db_version || db_version.localeCompare(patch.DB_VERSION, undefined, { numeric: true, sensitivity: 'base' }) == -1) {
            
            // patch.patches is a array of SQL lines to ADD or DROP columns etc
            for (const [num, patchLine] of Object.entries(patch.patches)) {
              try {
                result = dbRun(patchLine);
                if (result.success) {
                  successLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: success`);
                } else {
                  throw new Error(result.message);
                }
                
              } catch (ererrorr) {
                match = {
                  add: {
                    patch: patchLine.match(sqlMatch.add.patch),
                    error:  error.message.match(sqlMatch.add.error),
                  },
                  drop: {
                    patch: patchLine.match(sqlMatch.drop.patch),
                    error:  error.message.match(sqlMatch.drop.error),
                  }
                }
                
                // ADD COLUMN already exists:
                if (match.add.patch && match.add.error && match.add.patch[1].toUpperCase() == match.add.error[1].toUpperCase()) {
                  infoLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: skip`);
                
                // DROP COLUMN does not exist:
                } else if (match.drop.patch && match.drop.error && match.drop.patch[1].toUpperCase() == match.drop.error[1].toUpperCase()) {
                  infoLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: skip`);
                  
                } else {
                  errorLog(`${table}: patch ${num} from ${db_version} to ${patch.DB_VERSION}: ${error.code}: ${error.message}`);
                  throw error;
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
};

// ("ALTER TABLE logins ADD salt xxx".match(/ALTER[\s]+TABLE[\s]+[\"]?(\w+)[\"]?[\s]+ADD[\s]+(\w+)/i)[2] == 'column "salt" already exists'.match(/column[\s]+[\"]?(\w+)[\"]?[\s]+already[\s]+exists/i)[1])


export const hashPassword = async (password, salt) => {
  return new Promise((resolve, reject) => {
    salt = (salt) ? salt: crypto.randomBytes(16).toString('hex'); // Generate a random 16-byte salt
    crypto.scrypt(password, salt, 64, (error, derivedKey) => { // 64 is the key length
      if (error) return reject(error);
      resolve({ salt, hash: derivedKey.toString('hex') }); // Store salt and hash as hex strings
    });
  });
};


// verifyPassword works the same wherever a table has a salted hash
export const verifyPassword = async (credential, password, table='logins') => {
  
  try {
    debugLog(`for ${credential}`);
    // const login = dbGet(sql[table].select.saltHash, credential, credential);  // this worked perfectly until we switched to ES6
    const login = dbGet(sql[table].select.saltHash, {email:credential, mailbox:credential, username:credential });
    const saltHash = (login.success) ? login.message : false;
    // console.log('saltHash',saltHash);

    // return new Promise((resolve, reject) => {
    //   if (Object.keys(saltHash).length) {
    //     if (saltHash.salt && saltHash.hash) {
    //       crypto.scrypt(password, saltHash.salt, 64, (error, derivedKey) => {
    //         if (error) return reject(error);
    //         resolve(saltHash.hash === derivedKey.toString('hex'));
    //       });
    //     } else return reject(`please reset password for ${credential}`);
    //   } else return reject(`username ${credential} not found`);
    // });
    if (saltHash && Object.keys(saltHash).length) {
      console.log('Object.keys(saltHash).length',Object.keys(saltHash).length);
      if (saltHash.salt && saltHash.hash) {
        const { salt, hash } = await hashPassword(password, saltHash.salt);
        return saltHash.hash === hash;
      }
    }
    return false;

  } catch (error) {
    errorLog(error.message);
    throw new Error(error.message);
  }

};


// Function to update a password in a table
export const changePassword = async (table, id, password, containerName) => {
  let result, results;

  try {
    const { salt, hash } = await hashPassword(password);
    
    // special case for accounts as we need to run a command in the container
    if (table == 'accounts') {
      const targetDict = getTargetDict(containerName);

      debugLog(`Updating password for ${id} in ${table} for ${containerName}...`);
      results = await execSetup(`email update ${id} password`, targetDict);
      if (!results.returncode) {
        
        debugLog(`Updating password for ${id} in ${table} with scope=${containerName}...`);
        result = dbRun(sql[table].update.password, { salt:salt, hash:hash, scope:containerName }, id);
        successLog(`Password updated for ${table}: ${id}`);
        return { success: true, message: `Password updated for ${id} in ${table}`};
        
      } else {
        let ErrorMsg = await formatDMSError('execSetup', results.stderr);
        errorLog(ErrorMsg);
        return { success: false, message: ErrorMsg };
      }
      
    } else {
      debugLog(`Updating password for ${id} in ${table}...`);
      result = dbRun(sql.logins.update.password, { salt:salt, hash:hash, scope:containerName }, id);  // doesn't hurt to add scope even when unused
      if (result.success) {
        successLog(`Password updated for ${id} in ${table}`);
        return { success: true, message: `Password updated for ${id} in ${table}` };
        
      } else return result;
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


// Function to update a table in the db; id can very well be an array as well
export const updateDB = async (table, id, jsonDict, scope) => {  // jsonDict = { column:value, .. }
  debugLog(`${table} id=${id} for scope=${scope}`);   // don't show jsonDict as it may contain a password

  let result, scopedValues, value2test, testResult;
  try {
    if (!sql[table]) {
      throw new Error(`unknown table ${table}`);
    }
    
    if (!jsonDict || Object.keys(jsonDict).length == 0) {
      throw new Error('nothing to modify was passed');
    }
    
    // keep only keys defined as updatable
    let validDict = reduxPropertiesOfObj(jsonDict, Object.keys(sql[table].keys));
    if (!validDict || Object.keys(validDict).length == 0) {
      errorLog(`jsonDict is invalid: ${JSON.stringify(jsonDict)}`); // only dump stuff in container log
      throw new Error(`jsonDict is invalid`);
    }
    
    // for each new value to update...
    for (const [key, value] of Object.entries(validDict)) {
      
      // is the value the right type...
      if (typeof value == sql[table].keys[key]) {
        
        // password has its own function
        if (key == 'password') {
          return changePassword(table, id, value, scope);
          
        // objects must be saved as JSON
        } else if (typeof value == 'object') {
          result = dbRun(sql[table].update[key], {[key]:JSON.stringify(value)}, id);
          successLog(`Updated ${table} ${id} with ${key}=${value}`);
          return { success: true, message: `Updated ${table} ${id} with ${key}=${value}`};
        
        // other sqlite3 valid types and we can test specific scenarios
        } else {
          
          // check if the sql is defined for the key to update
          if (sql[table].update[key]) {
            
            // add named scope to the scopedValues, even if not used in the query it won't fail
            // scopedValues = (sql[table].scope) ? {[key]:value, scope:scope} : {[key]:value};
            scopedValues = {[key]:value, scope:scope};    // always add scope even when undefined, why care? it's failproof
            
            // is there a test for THAT value or ANY values?
            if (sql[table].update[key][value] || sql[table].update[key][undefined]) {
              
              // fix the value2test and scope as we may have tests for any values
              value2test = (sql[table].update[key][value]) ? value : undefined;
              
              // there is a test for THAT value and now we check with id in mind
              testResult = dbGet(sql[table].update[key][value2test].test, scopedValues, id);
              debugLog(`there is a test for ${table}.${key}=${value2test} and check(${testResult.message})=${sql[table].update[key][value2test].check(testResult.message)}`);
              
              // compare the result in the check function
              if (sql[table].update[key][value2test].check(testResult.message)) {
                
                // we pass the test
                result = dbRun(sql[table].update[key][value2test].pass, scopedValues, id);
                successLog(`Updated ${table} ${id} with ${key}=${value}`);
                return { success: true, message: `Updated ${table} ${id} with ${key}=${value}`};
                
              } else {
                // we do not pass the test
                errorLog(sql[table].update[key][value2test].fail);
                return { success: false, message: sql[table].update[key][value2test].fail};
              }
              
            // no test, update the db with new value
            } else {
              result = dbRun(sql[table].update[key], scopedValues, id);
              successLog(`Updated ${table} ${id} with ${key}=${value}`);
              return { success: true, message: `Updated ${table} ${id} with ${key}=${value}`};
            }
            
          } else {
            errorLog(`sql[${table}].update is missing [${key}]`);
            return { success: false, message: `sql[${table}].update is missing [${key}]`};
          }
          
        }
        
      } else errorLog(`typeof ${value} for ${key} is not ${sql[table].keys[key]}`)
    }
    return { success: true, message: 'Login updated successfully' };
    
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


export const deleteEntry = async (table, id, key, scope) => {
  debugLog(`${table} id=${id} for scope=${scope} and ${key}`);

  try {
    
    // check if the sql is defined for the key to delete
    if (sql[table].delete[key]) {
      
      // add named scope to the scopedValues, even if not used in the query it won't fail
      // let scopedValues = (sql[table].scope) ? {scope:scope} : {};
      let scopedValues = {scope:scope};    // always add scope, why care? it's failproof
      
      // check if delete should be tested
      if (sql[table].delete[key][id] || sql[table].delete[key][undefined]) {
        
        // fix the value2test as we may have tests for any values
        let value2test = (sql[table].delete[key][id]) ? value : undefined;
        
        // there is a test for THAT value and now we check with id in mind
        const testResult = dbGet(sql[table].delete[key][value2test].test, scopedValues, id);
        debugLog(`there is a test for ${table}.${key}=${value2test} and check(${testResult.message})=${sql[table].delete[key][value2test].check(testResult.message)}`);
        
        // compare the result in the check function
        if (sql[table].delete[key][value2test].check(testResult.message)) {
          
          // we pass the test
          const result = dbRun(sql[table].delete[key][value2test].pass, scopedValues, id);
          if (result.success) {
            successLog(`Entry deleted: ${id}`);
            return {success: true, message: `Entry deleted: ${id}`};
            
          } else return result;
        
        } else {
          // we do not pass the test
          errorLog(sql[table].delete[key][value2test].fail);
          return { success: false, message: sql[table].delete[key][value2test].fail};
        }
        
      } else {
        // no test
        const result = dbRun(sql[table].delete[key], scopedValues, id);
        if (result.success) {
          successLog(`Entry deleted: ${id}`);
          return {success: true, message: `Entry deleted: ${id}`};
          
        } else return result;
      }
      
    } else {
      errorLog(`sql[${table}].delete is missing [${key}]`);
      return { success: false, message: `sql[${table}].delete is missing [${key}]`};
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


export const getTargetDict = (containerName) => {
  
  let result;
  try {
    debugLog(`dbAll(sql.settings.select.settings, {scope:${containerName}})`);
    result = dbAll(sql.settings.select.settings, {scope:containerName});  // [{name:'protocol', value:'http'}, {name:'containerName', value:'dms'}, ..]
    
    // if (result.message.length >= 4) {
      // limit results to protocol, host, port, and also Authorization
      let targetDict = {
        protocol:       getValueFromArrayOfObj(result.message, 'protocol'),
        host:           getValueFromArrayOfObj(result.message, 'containerName'),
        port:           getValueFromArrayOfObj(result.message, 'DMS_API_PORT'),
        Authorization:  getValueFromArrayOfObj(result.message, 'DMS_API_KEY'),
      }
      
      // if (targetDict && Object.keys(targetDict).length == 4) return {success: true, message: targetDict}; // what?? no
      return targetDict;
    // }
    // return {success: false, message: 'missing values from this container'};

  } catch (error) {
    errorLog(error.message);
    dbOpen();
    return {success: false, message: error.message}
    // throw error;
  }
};


// module.exports = {
//   DB,
//   sql,
//   dbOpen,
//   dbInit,
//   dbUpdate,
//   dbRun,
//   dbGet,
//   dbAll,
//   dbCount,
//   hashPassword,
//   verifyPassword,
//   changePassword,
//   updateDB,
//   deleteEntry,
// };


// debug = true;
// containerName = 'dms';
// DMSGUI_CONFIG_PATH   = process.env.DMSGUI_CONFIG_PATH || '/app/config';
// DATABASE      = DMSGUI_CONFIG_PATH + '/dms-gui.sqlite3';
// DB = require('better-sqlite3')(DATABASE);
// process.on('exit', () => DB.close());
// function dbOpen() {DB = require('better-sqlite3')(DATABASE);}
// function debugLog(message) {console.debug(message)}
// function errorLog(message) {console.debug(message)}

// get saltHash from admin:
// DB.prepare("SELECT salt, hash FROM logins WHERE (email = @email OR username = @username)").get({"email":"admin","mailbox":"admin","username":"admin"})
  // {
  //   salt: 'fdebebcdcec4e534757a49473759355b',
  //   hash: 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18'
  // }

// env.DMSGUI_VERSION = (process.env.env.DMSGUI_VERSION.split("v").length == 2) ? process.env.env.DMSGUI_VERSION.split("v")[1] : process.env.env.DMSGUI_VERSION;
// sql=`BEGIN TRANSACTION;
// CREATE TABLE IF NOT EXISTS logins (
// username  TEXT NOT NULL UNIQUE PRIMARY KEY,
// salt      TEXT NOT NULL,
// hash      TEXT NOT NULL,
// email     TEXT DEFAULT ''
// );
// REPLACE INTO envs VALUES ('DB_VERSION_logins', '${env.DMSGUI_VERSION}');
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

// dbRun(`REPLACE INTO roles (username, mailbox, scope) VALUES (@username, @mailbox, ?)`, [{username:'user2',mailbox:'ops@doctusit.com'},{username:'user2',mailbox:'admin@doctusit.com'}], containerName)
// DB.prepare(`SELECT username, mailbox from roles WHERE 1=1 AND scope = @scope`).all(containerName)

// DB.prepare(`SELECT r.username, a.mailbox FROM accounts a LEFT JOIN roles r ON r.mailbox   = a.mailbox  WHERE 1=1 AND a.scope=r.scope AND a.scope = @scope`).all({scope:containerName})
// { username: 'user2', mailbox: 'ops@doctusit.com' },
// { username: 'user2', mailbox: 'admin@doctusit.com' }

// DB.prepare(`SELECT l.username, r.mailbox FROM logins l   LEFT JOIN roles r ON r.username  = l.username WHERE 1=1 AND r.scope = @scope`).all({scope:containerName})

// test and check:
// DB.prepare(`SELECT COUNT(isAdmin) value from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1`).get()  // { value: 2 }
// DB.prepare(`SELECT COUNT(isAdmin) value from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1 AND username IS NOT ?`).get('diane')

// DB.prepare(`SELECT COUNT(1) count`).get()
// { count: 1 }


// bug: leads to duplicate rows since we enabled PRIMARY key=id:
// DB.transaction("REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, @scope, 1)").run([{"name":"setupPath","value":"/usr/local/bin/setup","scope":"dms"},{"name":"env.DMS_CONFIG_PATH","value":"/tmp/docker-mailserver","scope":"dms"},{"name":"setupPath","value":"/usr/local/bin/setup","scope":"dms"},{"name":"env.DMS_CONFIG_PATH","value":"/tmp/docker-mailserver","scope":"dms"},{"name":"containerName","value":"dms","scope":"dms"}])
// DB.prepare("SELECT name, value from settings WHERE 1=1 AND isMutable = 1 AND scope = @scope").all({"scope":"dms"})
// DB.prepare("SELECT * from settings WHERE 1=1 AND isMutable = 1 AND scope = @scope").all({"scope":"dms"})
// [
// { name: 'setupPath', value: '/usr/local/bin/setup' },
// { name: 'env.DMS_CONFIG_PATH', value: '/tmp/docker-mailserver' },
// { name: 'setupPath', value: '/usr/local/bin/setup' },
// { name: 'env.DMS_CONFIG_PATH', value: '/tmp/docker-mailserver' },
// { name: 'containerName', value: 'dms' },
// { name: 'setupPath', value: '/usr/local/bin/setup' },
// { name: 'env.DMS_CONFIG_PATH', value: '/tmp/docker-mailserver' },
// { name: 'setupPath', value: '/usr/local/bin/setup' },
// { name: 'env.DMS_CONFIG_PATH', value: '/tmp/docker-mailserver' },
// { name: 'containerName', value: 'dms' },
// { name: 'setupPath', value: '/usr/local/bin/setup' },
// { name: 'env.DMS_CONFIG_PATH', value: '/tmp/docker-mailserver' },
// { name: 'setupPath', value: '/usr/local/bin/setup' },
// { name: 'env.DMS_CONFIG_PATH', value: '/tmp/docker-mailserver' },
// { name: 'containerName', value: 'dms' }
// ]


