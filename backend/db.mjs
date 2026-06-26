import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execCb);

import {
  getValueFromArrayOfObj,
  isNonEmptyDict,
  reduxPropertiesOfObj,
} from '../common.mjs';
import {
  updateAccount,
} from './accounts.mjs';
import {
  color,
  debugLog,
  errorLog,
  infoLog,
  successLog
} from './backend.mjs';
import {
  env,
  plugins,
} from './env.mjs';
import {
  getSettings,
} from './settings.mjs';

import Database from 'better-sqlite3';
import crypto from 'node:crypto';

var DB = null;

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
// dbClose();
// DB = new Database(buffer);

export const sql = {

// https://patorjk.com/software/taag/#p=display&f=ANSI+Regular&t=ROLES&x=none&v=4&h=4&w=80&we=false
// ███████ ███████ ████████ ████████ ██ ███    ██  ██████  ███████ 
// ██      ██         ██       ██    ██ ████   ██ ██       ██      
// ███████ █████      ██       ██    ██ ██ ██  ██ ██   ███ ███████ 
//      ██ ██         ██       ██    ██ ██  ██ ██ ██    ██      ██ 
// ███████ ███████    ██       ██    ██ ██   ████  ██████  ███████ 
settings: {

  key:  'name',
  keys:   {
    id:'number', 
    name:'string', 
    value:'string', 
    configID:'number', 
    isMutable:'number', 
  },
  scope:  true,

  // we don't dig of this table, we use config table instead
  // select: {
  //   count:    `SELECT COUNT(*) count FROM settings WHERE 1=1 AND isMutable = ${env.isMutable}`,
  //   settings: `SELECT name, value FROM settings WHERE 1=1 AND isMutable = ${env.isMutable} AND scope = @scope`,
  //   setting:  `SELECT value       FROM settings WHERE 1=1 AND isMutable = ${env.isMutable} AND scope = @scope AND name = ?`,
  //   envs:     `SELECT name, value FROM settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope`,
  //   env:      `SELECT value       FROM settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope AND name = ?`,
  //   scopes:   `SELECT DISTINCT value FROM settings WHERE 1=1 AND isMutable = ${env.isMutable} AND name = 'containerName' AND scope NOT IN (SELECT DISTINCT id from logins)`,
  // },
  
  // insert: {
  //   setting:  `REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, @scope, 1)`,
  //   env:      `REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, @scope, 0)`,
  // },
  
  // delete: {
  //   envs:     `DELETE FROM settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope`,
  //   env:      `DELETE FROM settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND scope = @scope AND name = ?`,
  // },
  
  init:   `BEGIN TRANSACTION;
          CREATE    TABLE IF NOT EXISTS settings (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          name      TEXT NOT NULL,
          value     TEXT NOT NULL,
          configID  INTEGER NOT NULL,
          isMutable BIT DEFAULT ${env.isImmutable},
          UNIQUE    (name, configID)
          );
          INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('settings', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    { DB_VERSION: '1.5.10',
      patches: [
        `ALTER TABLE settings ADD COLUMN configID INTEGER NOT NULL`,
        `REPLACE INTO settings (name, value, configID, isMutable) VALUES ('logins', '1.5.10', 1, ${env.isImmutable})`,
    ],
    },
  ],
},

// ██████   ██████  ██      ███████ ███████ 
// ██   ██ ██    ██ ██      ██      ██      
// ██████  ██    ██ ██      █████   ███████ 
// ██   ██ ██    ██ ██      ██           ██ 
// ██   ██  ██████  ███████ ███████ ███████ 
roles: {

  key:  'loginID',
  keys:   {
    id:'number', 
    loginID:'number', 
    role:'string', 
  },
  scope:  false,
  
  select: {
    count:            `SELECT COUNT(*) count FROM roles`,
    roles:            `SELECT role        FROM roles WHERE 1=1 AND loginID = (select id from logins WHERE 1=1 AND (mailbox = @mailbox OR username = @username))`,
    rolesById:        `SELECT role        FROM roles WHERE 1=1 AND loginID = @loginID`,
    rolesByObj:       `SELECT role        FROM roles WHERE 1=1 AND loginID = (select id from logins WHERE 1=1 AND {key} = @{key})`,
    granteeUsernames: `SELECT json_group_array(username) as managers FROM logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND role = @role`,
  },
  
  insert: {
    role:     `REPLACE INTO roles (loginID, role) VALUES (@loginID, ?)`,
  },
  
  update: {
    role:     `REPLACE INTO roles (loginID, role) VALUES (?, @role)`,
  },

  delete: {
    loginID:  `DELETE FROM roles WHERE 1=1 AND loginID = ?`,
  },

  init:   `BEGIN TRANSACTION;
          CREATE    TABLE IF NOT EXISTS roles (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          loginID   INTEGER NOT NULL,
          role      TEXT NOT NULL,
          UNIQUE    (loginID, role)
          );
          INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('roles', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
},

//  ██████  ██████  ███    ██ ███████ ██  ██████  ███████
// ██      ██    ██ ████   ██ ██      ██ ██       ██     
// ██      ██    ██ ██ ██  ██ █████   ██ ██   ███ ███████
// ██      ██    ██ ██  ██ ██ ██      ██ ██    ██      ██
//  ██████  ██████  ██   ████ ██      ██  ██████  ███████
configs: {

  key:  'name',
  keys:   {
    name:'string', 
    plugin:'string', 
    schema:'string', 
    scope:'string', 
  },
  scope:  false,
  select: {
    count:    `SELECT COUNT(*) count FROM configs `,
    id:       `SELECT id FROM configs WHERE 1=1 AND plugin = @plugin AND (name LIKE ?)`,
    configs:  `SELECT name as value, plugin, schema, scope FROM configs WHERE 1=1 AND plugin = @plugin AND (scope LIKE ?)`,
    settings: `SELECT s.name, s.value FROM settings s LEFT JOIN configs c ON s.configID = c.id WHERE 1=1 AND configID = (select id FROM configs WHERE c.name = ? AND plugin = @plugin) AND isMutable = ${env.isMutable}`,
    setting:  `SELECT         s.value FROM settings s LEFT JOIN configs c ON s.configID = c.id WHERE 1=1 AND configID = (select id FROM configs WHERE c.name = ? AND plugin = @plugin) AND isMutable = ${env.isMutable}   AND s.name = ?`,
    envs:     `SELECT s.name, s.value FROM settings s LEFT JOIN configs c ON s.configID = c.id WHERE 1=1 AND configID = (select id FROM configs WHERE c.name = ? AND plugin = @plugin) AND isMutable = ${env.isImmutable}`,
    env:      `SELECT         s.value FROM settings s LEFT JOIN configs c ON s.configID = c.id WHERE 1=1 AND configID = (select id FROM configs WHERE c.name = ? AND plugin = @plugin) AND isMutable = ${env.isImmutable} AND s.name = ?`,
  },
  
  insert: {
    //    name        plugin      schema      scope
    //    -----------------------------------------
    // 1	DB_VERSION	dms-gui	    DB_VERSION  dms-gui
    // 2	dms	        mailserver	dms         dms-gui
    // 3	roles       dms-gui     logins      mailserver
    
    config:   `INSERT  INTO configs (name, plugin, schema, scope) VALUES (?, @plugin, @schema, @scope) RETURNING id`,

    // 1	DB_VERSION	dms-gui	    DB_VERSION  dms-gui
    //    -----------------------------------------
      // name	            value	                configID  isMutable
      // ----------------------------------------------------------
      // settings	        1.5.46	              1	        0
      // configs	        1.5.46	              1	        0

    // 2	dms	        mailserver	dms         dms-gui
    //    -----------------------------------------
      // name	            value	                configID  isMutable
      // ----------------------------------------------------------
      // schema	          dms	                  2	        1
      // protocol	        http	                2	        1
      // DMS_API_PORT	    8888	                2	        1
      // timeout	        4	                    2	        1
      // setupPath	      /usr/local/bin/setup	2	        1
      // containerName	  dms	                  2	        1
      // DOVECOT_VERSION	2.3.19.1	            2	        0

    setting:  `REPLACE INTO settings (name, value, configID, isMutable) VALUES (@name, @value, (select id FROM configs WHERE name = ? AND plugin = @plugin), 1)`,
    env:      `REPLACE INTO settings (name, value, configID, isMutable) VALUES (@name, @value, (select id FROM configs WHERE name = ? AND plugin = @plugin), 0)`,
  },
  
  update: {
    config:   `UPDATE configs set name = @name, schema = @schema WHERE 1=1 AND plugin = @plugin AND name = ? RETURNING id)`,
  },
  
  delete: {
    config:   `DELETE FROM configs WHERE 1=1 AND name = ? AND plugin = @plugin AND schema = @schema`,
    envs:     `DELETE FROM settings WHERE 1=1 AND isMutable = ${env.isImmutable} AND configID = (select id FROM configs WHERE name = ? AND plugin = @plugin)`,
    settings: `DELETE FROM settings WHERE 1=1 AND isMutable = ${env.isMutable}   AND configID = (select id FROM configs WHERE name = ? AND plugin = @plugin)`,
  },
  init:   `BEGIN TRANSACTION;
          CREATE    TABLE IF NOT EXISTS configs (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          name      TEXT NOT NULL,
          plugin    TEXT NOT NULL,
          schema    TEXT NOT NULL,
          scope     TEXT NOT NULL,
          UNIQUE    (name, plugin)
          );
          INSERT           INTO configs    (name, plugin, schema, scope)      VALUES ('DB_VERSION', 'dms-gui', 'DB_VERSION', 'dms-gui');
          INSERT OR IGNORE INTO settings  (name, value, configID, isMutable) VALUES ('configs', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
},


// ██       ██████   ██████  ██ ███    ██ ███████ 
// ██      ██    ██ ██       ██ ████   ██ ██      
// ██      ██    ██ ██   ███ ██ ██ ██  ██ ███████ 
// ██      ██    ██ ██    ██ ██ ██  ██ ██      ██ 
// ███████  ██████   ██████  ██ ██   ████ ███████ 
logins: {

  desc:   "password in the the list of keys even tho it's not a column",
  key:     'id',
  keys:   {
    mailbox:'string', 
    username:'string', 
    email:'string', 
    salt:'string', 
    hash:'string', 
    isAdmin:'number', 
    isActive:'number', 
    isAccount:'number', 
    mailserver:'string', 
    refreshToken:'string', 
    password:'string',
  },
  scope:  'mailserver',
  select: {
    count:      `SELECT COUNT(*) count from logins WHERE 1=1 and mailserver = @mailserver`,
    // login:      `SELECT id, username, email, isAdmin, isActive, isAccount, mailserver, roles, mailbox from logins WHERE 1=1 AND (mailbox = @mailbox OR username = @username)`,
    // loginById:  `SELECT id, username, email, isAdmin, isActive, isAccount, mailserver, roles, mailbox from logins WHERE 1=1 AND id = @id`,
    // loginByObj: `SELECT id, username, email, isAdmin, isActive, isAccount, mailserver, roles, mailbox from logins WHERE 1=1 AND {key} = @{key}`,
    // logins:     `SELECT id, username, email, isAdmin, isActive, isAccount, mailserver, roles, mailbox from logins WHERE 1=1`,
    // admins:     `SELECT id, username, email, isAdmin, isActive, isAccount, mailserver, roles, mailbox from logins WHERE 1=1 AND isAdmin = 1`,
    login:            `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND (mailbox = @mailbox OR username = @username) GROUP BY l.id`,
    loginById:        `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND l.id = @id GROUP BY l.id`,
    loginByObj:       `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND l.{key} = @{key} GROUP BY l.id`,
    refreshToken:     `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND l.id = ? AND AND refreshToken = @refreshToken GROUP BY l.id`,
    loginSalted:      `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, salt, hash, attempts, lockout_until, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND (mailbox = @mailbox OR username = @username) GROUP BY l.id`,
    loginByIdSalted:  `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, salt, hash, attempts, lockout_until, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND l.id = @id GROUP BY l.id`,
    loginByObjSalted: `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, salt, hash, attempts, lockout_until, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND l.{key} = @{key} GROUP BY l.id`,
    logins:     `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 GROUP BY l.id`,
    admins:     `SELECT l.id, username, email, isAdmin, isActive, isAccount, mailserver, mailbox, json_group_array(r.role) AS roles from logins l LEFT JOIN roles r ON l.id = r.loginID WHERE 1=1 AND isAdmin = 1 GROUP BY l.id`,
    // roles:      `SELECT roles from logins WHERE 1=1 AND (mailbox = @mailbox OR username = @username)`,
    // rolesById:  `SELECT roles from logins WHERE 1=1 AND id = @id`,
    // rolesByObj: `SELECT roles from logins WHERE 1=1 AND {key} = @{key}`,
    salt:       `SELECT salt from logins WHERE id = ?`,
    hash:       `SELECT hash from logins WHERE id = ?`,
    saltHash:   `SELECT salt, hash FROM logins WHERE id = ?`,
  },
  
  insert: {
    // since 1.5.67 we have the roles table
    // login:    `INSERT INTO logins (mailbox, username, email, salt, hash, isAdmin, isAccount, isActive, mailserver, roles) VALUES (@mailbox, @username, @email, @salt, @hash, @isAdmin, @isAccount, @isActive, @mailserver, @roles) RETURNING id`,
    login:    `INSERT INTO logins (mailbox, username, email, salt, hash, isAdmin, isAccount, isActive, mailserver) VALUES (@mailbox, @username, @email, @salt, @hash, @isAdmin, @isAccount, @isActive, @mailserver) RETURNING id`,
  },
  
  update: {
    password: `UPDATE logins set salt=@salt, hash=@hash WHERE id = ?`,
    refreshToken: `UPDATE logins set refreshToken = @refreshToken WHERE id = ?`,
    resetToken: `UPDATE logins set refreshToken = NULL WHERE id = ?`,
    resetTokens: `UPDATE logins set refreshToken = NULL`,
    resetAttempts: `UPDATE logins set attempts=@attempts, lockout_until=@lockout_until WHERE id = ?`,
    mailbox: {
      undefined: {
        desc:   "allow to change a login's mailbox only if isAdmin or not isAccount",
        test:   `SELECT COUNT(mailbox) count from logins WHERE 1=1 AND (isAdmin = 1 OR isAccount = 0) AND id = ?`,
        check:  function(result) { return result.count == 1; },
        pass:   `UPDATE logins set mailbox = @mailbox WHERE id = ?`,
        fail:   "Cannot change mailbox from a mailbox-linked user.",
      },
    },
    isAdmin: {
      0: {
        desc:   "refuse to demote the last admin",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1 AND id IS NOT ?`,
        check:  function(result) { return result.count > 0; },
        pass:   `UPDATE logins set isAdmin = @isAdmin WHERE id = ?`,
        fail:   "Cannot demote the last admin, how will you administer dms-gui?",
      },
      1: {
        desc:   "not a test, just flipping login to isAdmin also flips isAccount to 0",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND id = ?`,
        check:  function() { return true; },
        pass:   `UPDATE logins set isAdmin = @isAdmin, isAccount = 0, isActive = 1 WHERE id = ?`,
        fail:   "Cannot demote the last admin, how will you administer dms-gui?",
      },
    },
    isActive: {
      0: {
        desc:   "refuse to deactivate the last admin",
        test:   `SELECT COUNT(isActive) count from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1 AND id IS NOT ?`,
        check:  function(result) { return result.count > 0; },
        pass:   `UPDATE logins set isActive = @isActive WHERE id = ?`,
        fail:   "Cannot deactivate the last admin, how will you administer dms-gui?",
      },
      1: {
        desc:   "not really a test",
        test:   `SELECT COUNT(isActive) count from logins WHERE 1=1 AND id = ?`,
        check:  function(result) { return result.count == 1; },
        pass:   `UPDATE logins set isActive = @isActive WHERE id = ?`,
      },
    },
    isAccount: {
      0: {
        desc:   "refuse to be isAccount when isAdmin",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND isAdmin = 1 AND id = ?`,
        check:  function(result) { return result.count == 0; },
        pass:   `UPDATE logins set isAccount = @isAccount WHERE id = ?`,
        fail:   "Cannot make an admin also a linked account, it's one or the other",
      },
      1: {
        desc:   "not a test, just flipping login to isAccount also flips isAdmin to 0",
        test:   `SELECT COUNT(isAccount) count from logins WHERE 1=1 AND id = ?`,
        check:  function() { return true; },
        pass:   `UPDATE logins set isAccount = @isAccount, isAdmin = 0 WHERE id = ?`,
      },
    },
  },
  
  delete: {
    id: {
      undefined: {
        desc:   "refuse to delete last admin",
        test:   `SELECT COUNT(isAdmin) count from logins WHERE 1=1 AND isAdmin = 1 AND id IS NOT ?`,
        check:  function(result) { return result.count > 0; },
        pass:   `DELETE from logins WHERE 1=1 AND id = ?`,
        fail:   "Cannot delete the last admin, how will you administer dms-gui?",
      },
    },
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE IF NOT EXISTS logins (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          mailbox   TEXT NOT NULL UNIQUE,
          username  TEXT NOT NULL UNIQUE,
          email     TEXT,
          salt      TEXT,
          hash      TEXT,
          isAdmin   BIT DEFAULT 0,
          isActive  BIT DEFAULT 1,
          isAccount BIT DEFAULT 1,
          mailserver  TEXT,
          refreshToken  TEXT,
          attempts  INTEGER DEFAULT 0,
          lockout_until  INTEGER DEFAULT 0
          );
          INSERT OR IGNORE INTO logins (mailbox, username, email, salt, hash, isAdmin, isActive, isAccount) VALUES ('admin@dms-gui.com', 'admin', 'admin@dms-gui.com', 'fdebebcdcec4e534757a49473759355b', 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18', 1, 1, 0);
          INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('logins', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    // { DB_VERSION: '1.4.7',
    //   patches: [
    //     `ALTER TABLE logins ADD refreshToken    TEXT`,
    //     `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_logins', '1.4.7', 1, ${env.isImmutable})`,
    //   ],
    // },
    { DB_VERSION: '1.5.13',
      patches: [
        `ALTER TABLE logins RENAME COLUMN favorite TO mailserver`,
        `REPLACE INTO settings (name, value, configID, isMutable) VALUES ('logins', '1.5.13', 1, ${env.isImmutable})`,
      ],
    },
    { DB_VERSION: '1.5.71',
      patches: [
        `ALTER TABLE logins ADD attempts      INTEGER DEFAULT 0`,
        `ALTER TABLE logins ADD lockout_until INTEGER DEFAULT 0`,
        `REPLACE INTO settings (name, value, configID, isMutable) VALUES ('logins', '1.5.71', 1, ${env.isImmutable})`,
      ],
    },
  ],
},


//  █████   ██████  ██████  ██████  ██    ██ ███    ██ ████████ ███████ 
// ██   ██ ██      ██      ██    ██ ██    ██ ████   ██    ██    ██      
// ███████ ██      ██      ██    ██ ██    ██ ██ ██  ██    ██    ███████ 
// ██   ██ ██      ██      ██    ██ ██    ██ ██  ██ ██    ██         ██ 
// ██   ██  ██████  ██████  ██████   ██████  ██   ████    ██    ███████ 
accounts: {
      
  desc:   "password is in the the list of keys even tho it's not a column; scope = containerName; schema = type of container: dms, poste, etc",
  key:     'mailbox',
  keys:   {
    mailbox:'string', 
    domain:'string',
    salt:'string',
    hash:'string',
    configID:'number', 
    password:'string',
    storage:'object', 
    name:'string', 
  },
  scope:  'name',
  select: {
    count:    `SELECT COUNT(*) count from accounts WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @name)`,
    // accounts: `SELECT a.mailbox, a.domain, a.storage, l.username
    //            FROM accounts a 
    //            LEFT JOIN configs c ON c.id = a.configID 
    //            LEFT JOIN logins l ON l.mailbox = a.mailbox 
    //            WHERE 1=1 
    //            AND c.plugin = 'mailserver' 
    //            AND c.name = ? 
    //            ORDER BY a.domain, a.mailbox`,

    // since 1.5.67 with table roles:
    accounts: `SELECT a.mailbox, a.domain, a.storage, l.username, json_group_array(m.username) AS managers
               FROM accounts a 
               LEFT JOIN configs c ON c.id = a.configID 
               LEFT JOIN logins l ON l.mailbox = a.mailbox 
               LEFT JOIN roles r ON r.role = a.mailbox 
               LEFT JOIN logins m ON m.id = r.loginID 
               WHERE 1=1 
               AND c.plugin = 'mailserver' 
               AND c.name = ? 
               GROUP BY a.mailbox
               ORDER BY a.domain, a.mailbox`,
              // mailbox          domain      storage                                       login             managers
              // --------------------------------------------------------------------------------------------------------------
              // admin@domain.com	domain.com	{"used":"6.8M","total":"5.2G","percent":"0"}	admin@domain.com	[null]
              // chloe@domain.com	domain.com	{"used":"45M","total":"5.2G","percent":"0"}	                  	["test","testtt"]
              // test@domain.com	domain.com	{}	                                          test	            [null]

    mailboxes:`SELECT mailbox FROM accounts WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name LIKE @name)`,
    mailbox:  `SELECT mailbox FROM accounts WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name LIKE @name) AND mailbox LIKE ?`,
    saltHash: `SELECT salt, hash FROM accounts WHERE mailbox = @mailbox`,
    configs:  `SELECT DISTINCT name as value, 'mailserver' as plugin, schema, 'dms-gui' as scope FROM accounts a LEFT JOIN configs c ON c.id = a.configID WHERE 1=1 AND mailbox IN (?)`,
  },
  
  insert: {
    fromDMS:  `REPLACE INTO accounts (mailbox, domain, storage, configID)     VALUES (@mailbox, @domain, @storage,     (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = ?))`,
    fromGUI:  `REPLACE INTO accounts (mailbox, domain, salt, hash, configID)  VALUES (@mailbox, @domain, @salt, @hash, (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = ?))`,
  },
  
  update: {
    password: `UPDATE accounts set salt=@salt, hash=@hash WHERE 1=1 AND mailbox = ?`,
    storage:  `UPDATE accounts set storage = @storage     WHERE 1=1 AND mailbox = ?`,
  },
  
  delete: {
    mailbox:  `DELETE FROM accounts WHERE 1=1 AND mailbox = ? AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @scope)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE IF NOT EXISTS accounts (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          mailbox   TEXT NOT NULL UNIQUE,
          domain    TEXT,
          salt      TEXT,
          hash      TEXT,
          storage   TEXT DEFAULT '{}',
          configID  INTEGER NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('accounts', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    // { DB_VERSION: '1.1.3',
    //   patches: [
    //     `ALTER TABLE accounts ADD scope   TEXT DEFAULT '${live.DMS_CONTAINER}'`,
    //     `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_accounts', '1.1.3', 1, ${env.isImmutable})`,
    //   ],
    // },
  ],
},

//  █████  ██      ██  █████  ███████ ███████ ███████ 
// ██   ██ ██      ██ ██   ██ ██      ██      ██      
// ███████ ██      ██ ███████ ███████ █████   ███████ 
// ██   ██ ██      ██ ██   ██      ██ ██           ██ 
// ██   ██ ███████ ██ ██   ██ ███████ ███████ ███████ 
aliases: {
      
  key:     'source',
  keys:   {
    source:'string', 
    destination:'string', 
    regex:'number',
    configID:'number',
    name:'string',
  },
  scope:  'name',
  select: {
    count:    `SELECT COUNT(*) count from aliases WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @name)`,
    aliases:  `SELECT a.source, a.destination, a.regex, l.username 
               FROM aliases a 
               LEFT JOIN configs c ON c.id = a.configID 
               LEFT JOIN logins l ON l.mailbox = a.destination 
               WHERE 1=1 
               AND c.plugin = 'mailserver' 
               AND c.name = ? 
               ORDER BY a.source, a.destination`,
  },
  
  insert: {
    alias:    `REPLACE INTO aliases (source, destination, regex, configID) VALUES (@source, @destination, @regex, (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = ?))`,
  },
  
  delete: {
    bySource: `DELETE FROM aliases WHERE 1=1 AND source = ? AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @scope)`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE IF NOT EXISTS aliases (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          source      TEXT NOT NULL,
          destination TEXT NOT NULL,
          regex       BIT DEFAULT 0,
          configID    INTEGER NOT NULL,
          UNIQUE (source, destination)
          );
          INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('aliases', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
},

// ██████   ██████  ███    ███  █████  ██ ███    ██ ███████ 
// ██   ██ ██    ██ ████  ████ ██   ██ ██ ████   ██ ██      
// ██   ██ ██    ██ ██ ████ ██ ███████ ██ ██ ██  ██ ███████ 
// ██   ██ ██    ██ ██  ██  ██ ██   ██ ██ ██  ██ ██      ██ 
// ██████   ██████  ██      ██ ██   ██ ██ ██   ████ ███████ 
domains: {
      
  key:     'domain',
  keys:   {
    domain:'string', 
    dkim:'string', 
    keytype:'string', 
    keysize:'number', 
    path:'string',
    dnsProvider:'string',
    configID:'number',
  },
  scope:  'name',
  select: {
    count:    `SELECT COUNT(*) count FROM domains WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @name)`,
    domains:  `SELECT * FROM domains WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @name)`,
    domain:   `SELECT * FROM domains WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @name) AND domain = ?`,
    dkims:    `SELECT DISTINCT dkim FROM domains WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @name)`,
    dkim:     `SELECT dkim FROM domains WHERE 1=1 AND configID = (SELECT id FROM configs WHERE plugin = 'mailserver' AND name = @name) AND domain = ?`,
  },
  
  insert: {
    domain:   `REPLACE INTO domains (domain, dkim, keytype, keysize, path, scope) VALUES (@domain, @dkim, @keytype, @keysize, @path, @scope)`,
  },
  
  delete: {
    domain:   `DELETE FROM domains WHERE 1=1 AND scope = @scope AND domain = ?`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE IF NOT EXISTS domains (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          domain      TEXT NOT NULL UNIQUE,
          dkim        TEXT DEFAULT '${env.DKIM_SELECTOR_DEFAULT}',
          keytype     TEXT DEFAULT 'rsa',
          keysize     TEXT DEFAULT 2048,
          path        TEXT DEFAULT '${env.DMS_CONFIG_PATH}/rspamd/dkim/${env.DKIM_KEYTYPE_DEFAULT}-${env.DKIM_KEYSIZE_DEFAULT}-${env.DKIM_SELECTOR_DEFAULT}-$domain.private.txt',
          dnsProvider TEXT,
          configID    INTEGER NOT NULL
          );
          INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('domains', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
  patch: [
    // { DB_VERSION: '1.1.2',
    //   patches: [
    //     `ALTER TABLE domains ADD keytype TEXT DEFAULT 'rsa'`,
    //     `ALTER TABLE domains ADD keysize TEXT DEFAULT '2048'`,
    //     `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '1.1.2', 1, ${env.isImmutable})`,
    //   ],
    // },
    // { DB_VERSION: '1.1.3',
    //   patches: [
    //     `ALTER TABLE domains ADD scope   TEXT DEFAULT '${live.DMS_CONTAINER}'`,
    //     `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '1.1.3', 1, ${env.isImmutable})`,
    //   ],
    // },
    // { DB_VERSION: '1.5.7',
    //   patches: [
    //     `ALTER TABLE domains ADD provider   TEXT`,
    //     `REPLACE INTO settings (name, value, scope, isMutable) VALUES ('DB_VERSION_domains', '1.5.7', 1, ${env.isImmutable})`,
    //   ],
    // },
  ],
},

// ██████  ███    ██ ███████ 
// ██   ██ ████   ██ ██      
// ██   ██ ██ ██  ██ ███████ 
// ██   ██ ██  ██ ██      ██ 
// ██████  ██   ████ ███████ 
dns: {
      
  desc:   'dns entries, with SRV priority/weight/port being use also for TLSA usage/selector/type, MX, CERT type/tag/algo, and DNSKEY flag/protocol/algo',
  key:     'domain',
  keys:   {
    domain:'string', 
    name:'string', 
    type:'string', 
    ttl:'number', 
    priority:'number', 
    weight:'number', 
    port:'number', 
    data:'string',
    CF_PROXY_ON:'number',
  },
  scope:  false,
  select: {
    count:    `SELECT COUNT(*) count FROM dns WHERE 1=1 AND domain = @domain`,
    dns:      `SELECT * FROM dns WHERE 1=1 AND domain = @domain`,
    byT:      `SELECT * FROM dns WHERE 1=1 AND domain = @domain AND type = ?`,
    byName:   `SELECT * FROM dns WHERE 1=1 AND domain = @domain AND name = ?`,
    byNameT:  `SELECT * FROM dns WHERE 1=1 AND domain = @domain AND name = ? AND type = ?`,
    byNameTP: `SELECT * FROM dns WHERE 1=1 AND domain = @domain AND name = ? AND type = ? AND priority = ?`,
  },
  
  insert: {
    entry:      `REPLACE INTO dns (domain, name, type, ttl, priority, data, CF_PROXY_ON) VALUES (@domain, @name, @type, @ttl, @priority, @data, @CF_PROXY_ON)`,
    entryFull:  `REPLACE INTO dns (domain, name, type, ttl, priority, weight, port, data, CF_PROXY_ON) VALUES (@domain, @name, @type, @ttl, @priority, @weight, @port, @data, @CF_PROXY_ON)`,
    CF_PROXY_ON:`REPLACE INTO dns (domain, name, type, priority, CF_PROXY_ON) VALUES (@domain, @name, @type, @priority, @CF_PROXY_ON)`,
  },
  
  delete: {
    all:        `DELETE FROM dns`,
    byDomain:   `DELETE FROM dns WHERE 1=1 AND domain = @domain`,
    entry:      `DELETE FROM dns WHERE 1=1 AND domain = @domain AND name = @name AND type = @type AND priority = @priority`,
  },
  
  init:  `BEGIN TRANSACTION;
          CREATE TABLE IF NOT EXISTS dns (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          domain      TEXT NOT NULL UNIQUE,
          name        TEXT NOT NULL,
          type        TEXT NOT NULL,
          priority    INTEGER,
          weight      INTEGER,
          port        INTEGER,
          data        TEXT NOT NULL,
          ttl         INTEGER DEFAULT 1,
          CF_PROXY_ON BIT DEFAULT 0,
          UNIQUE (domain, name, type, priority)
          );
          INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('dns', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
          COMMIT;`,
  
},
};

// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
// TypeError: SQLite3 can only bind numbers, strings, bigints, buffers, and null


const dbClose = () => {
  try {
    // Only attempt cleanup if DB is genuinely instantiated and open
    if (DB && typeof DB.pragma === 'function' && DB.open) {
      DB.pragma('wal_checkpoint(TRUNCATE)'); 
      DB.close();
    }
  } catch (e) {
    // Suppress or log errors if the DB was already closed elsewhere
    errorLog(`Exit checkpoint failed: ${e.message}`);
  }
};


// Register process listeners EXACTLY ONCE at module root
process.on('exit', dbClose);
process.on('SIGHUP', () => { dbClose(); process.exit(129); });
process.on('SIGINT', () => { dbClose(); process.exit(130); });
process.on('SIGTERM', () => { dbClose(); process.exit(143); });


export const dbOpen = () => {
  try {
    // If already open, return the cached connection
    if (DB && typeof DB.pragma === 'function' && DB.open) {
      return DB; 
    }

    // Initialize the database connection
    DB = new Database(env.DATABASE);
    
    // Enable Write-Ahead Log mode
    DB.pragma('journal_mode = WAL');

    // FORCE automatic background checkpoints much faster.
    // Triggers a checkpoint every page (~4KB) instead of 1000 pages (~4MB)
    DB.pragma('wal_autocheckpoint = 1');

    // Set a hard limit on the WAL file size (measured in bytes).
    // When a checkpoint finishes, if the WAL is bigger than 1MB, it truncates it back to 0.
    DB.pragma('journal_size_limit = 16384'); 
    
    return DB;
  } catch (error) {
    errorLog(`dbOpen error: ${error.code}: ${error.message}`);
    throw error;
  }
};


// this is complete garbage apparently:
// export const dbOpen = () => {
//   try {
//     // if (DB && DB.inTransaction) DB.close();
//     if (DB) DB.close();
    
//     if (!DB || !DB.open) {
//       // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#close---this
//       // DB = new Database(env.DATABASE, { verbose: console.debug });
//       DB = new Database(env.DATABASE);
//       DB.pragma('journal_mode = WAL');

//       // https://github.com/WiseLibs/better-sqlite3/blob/HEAD/docs/api.md#close---this
//       process.on('exit', () => DB.close());
//       process.on('SIGHUP', () => process.exit(128 + 1));
//       process.on('SIGINT', () => process.exit(128 + 2));
//       process.on('SIGTERM', () => process.exit(128 + 15));
      
//       return DB;
//     }
//   } catch (error) {
//     errorLog(`dbOpen error: ${error.code}: ${error.message}`);
//     throw error;
//   }
// };

// password: `REPLACE INTO accounts (mailbox, salt, hash, scope) VALUES (@mailbox, @salt, @hash, ?)`,

// https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#binding-parameters
// dbRun takes params as Array = multiple inserts or String/Object = single insert
// dbRun takes multiple anonymous parameters anonParams as an array of strings, for WHERE clause value(s) when needed
export const dbRun = (sql, params={}, ...anonParams) => {

  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=",sql);
  }
  
  // inserts returning a single id must call db.get or the id will never be returned
  if (sql.includes(' RETURNING ')) return dbGet(sql, params, anonParams);

  let result, insertMany;
  try {
    
    // exec https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#execstring---this
    if (sql.match(/BEGIN TRANSACTION/i)) {
      debugLog(`DB.exec(${sql})`);
      result = DB.exec(sql);
      debugLog(`${color.HIG}${color.y}DB.exec multiple inserts loop detected`);

    // multiple inserts at once: DB.transaction https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function
    } else if (Array.isArray(params) && params.length) {
      
      // if there values to store as ?
      if (anonParams.length) {
        debugLog(`${color.HIG}${color.y}DB.transaction("${sql}").run(${JSON.stringify(params)}, ${anonParams})`);
        insertMany = DB.transaction((params) => {
          for (const param of params) DB.prepare(sql).run(param, anonParams);
        });
        result = insertMany(params);
        
      // no values to store as ?, only {name:value} is passed
      } else {
        debugLog(`${color.HIG}${color.y}DB.transaction("${sql}").run(${JSON.stringify(params)})`);
        insertMany = DB.transaction((params) => {
          for (const param of params) {
            DB.prepare(sql).run(param);
          }
        });
        result = insertMany(params);
      }
      debugLog(`DB.transaction success`);
      
    // single statement: DB.prepare https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#runbindparameters---object
    } else {
      if (anonParams.length) {
        debugLog(`${color.HIG}${color.y}DB.prepare("${sql}").run(${JSON.stringify(params)}, ${anonParams})`);
        result = DB.prepare(sql).run(params, anonParams);
        
      } else {
        debugLog(`${color.HIG}${color.y}DB.prepare("${sql}").run(${JSON.stringify(params)})`);
        result = DB.prepare(sql).run(params);
      }
      debugLog(`DB.prepare success`);
    }
    return {success: true, message: result};
    // result = { changes: 0, lastInsertRowid: 0 }

  } catch (error) {
    errorLog(`${error?.code}: ${error.message}`);
    dbOpen();
    return {success: false, error: error.message, code: error?.code};
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
// error.message=near ")": syntax error
// drop column that does not exist:
// error.code=SQLITE_ERROR
// error.message=no such column: "password"
// add column that exists:
// error.code=SQLITE_ERROR
// error.message=duplicate column name: salt


export const dbCount = (table, scope, schema) => {
  
  let result;
  let params={};
  try {
    
    if (scope && sql[table]?.scope) params[sql[table].scope] = scope;
    if (schema)                     params.schema = schema;

    debugLog(`${color.y}DB.prepare("${sql[table].select.count}").get(${JSON.stringify(params)})`);
    result = DB.prepare(sql[table].select.count).get(params);
    debugLog(`success:`, result);
    
    return {success: true, message: result.count};

  } catch (error) {
    errorLog(`${error?.code}: ${error.message}`);
    dbOpen();
    return {success: false, error: error.message, code: error?.code};
    // throw error;
  }
};

export const dbGet = (sql, params={}, ...anonParams) => {
  
  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=", sql);
  }
  
  let result;
  try {

    if (sql.includes(' RETURNING ')) {
      debugLog(`${color.HIG}${color.y}DB.prepare("${sql}").get(${JSON.stringify(params)}, ${JSON.stringify(anonParams)})`);
    } else {
      debugLog(`${color.y}DB.prepare("${sql}").get(${JSON.stringify(params)}, ${JSON.stringify(anonParams)})`);
    }
    result = DB.prepare(sql).get(params, anonParams);
      
    return {success: true, message: result};
    // result = { name: 'node', value: 'v24' } or { value: 'v24' } or undefined

  } catch (error) {
    errorLog(`${error?.code}: ${error.message}`);
    dbOpen();
    return {success: false, error: error.message, code: error?.code};
    // throw error;
  }
};

// WARNING: use the spread syntax when passing an array in anonParams!
export const dbAll = (sql, params={}, ...anonParams) => {
  
  if (typeof sql != "string") {
    throw new Error("Error: sql argument must be a string: sql=",sql);
  }
  
  let result;
  try {
    if (anonParams.length) {
      debugLog(`${color.y}DB.prepare("${sql}").all(${JSON.stringify(anonParams)}, ${JSON.stringify(params)})`);
      result = DB.prepare(sql).all(params, anonParams);
      
    } else {
      debugLog(`${color.y}DB.prepare("${sql}").all(${JSON.stringify(params)})`);
      result = DB.prepare(sql).all(params);
    }
    // debugLog('ddebug result',result);
    return {success: true, message: result};
    // result = [ { name: 'node', value: 'v24' }, { name: 'node2', value: 'v27' } ] or []

  } catch (error) {
    errorLog(`${error?.code}: ${error.message}`);
    errorLog(error.message || error);
    dbOpen();
    return {success: false, error: error.message, code: error?.code};
    // throw error;
  }
};

// dbInit is not async, hell no
export const dbInit = (DATABASE_RESET=false) => {

  if (DATABASE_RESET) {
    infoLog(`${color.HIG}${color.REV}start ${color.r} RESET DATABASE`);
    exec(`rm -f ${env.DATABASE}`);
  } else {
    infoLog(`${color.REV}start ${color.g} production`);
  }
  dbOpen();
  let result;

  for (const [table, actions] of Object.entries(sql)) {
    
    // init db table no matter what
    if (actions.init) {

      try {
        result = dbGet(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        if (!result.success || !result.message) {
          result = dbRun(actions.init);
          // result example:
          // {
          //   success: true,
          //   message: Database {
          //     name: '/app/config/dms-gui.sqlite3',
          //     open: true,
          //     inTransaction: false,
          //     readonly: false,
          //     memory: false
          // }

          if (result.success) {
            // infoLog(`${table}: ${result.message}`, result);
            successLog(`table ${table} created`);
            debugLog(`table ${table} result.message:`, result.message);

          // the below can never happen
          // } else if (result?.error && result?.error.match(/already exists/i)) {
          //   infoLog(`${table}: exist`);

          } else {
            errorLog(`${table}: ${result?.code}: ${result?.error}`);
            throw new Error(`${table}: ${result?.code}: ${result?.error}`);
          }

        } else infoLog(`${table}: exist`);
        // dbUpgrade(table);
        
      } catch (error) {
        errorLog(`${table}: ${error.message}`, error);
        throw error;  // we want startup to stop completely if init or upgrade fails miserably and leave the user stranded
      }
    }
  }
  dbClose();
  infoLog(`${color.REV}${color.g}done`);
};


// dbUpgrade is not async, hell no
export const dbUpgrade = () => {
  infoLog(`${color.REV}start  UPGRADE to ${env.DMSGUI_VERSION}`);

  dbOpen();
  let result, db_version, match;
  // let actions = sql[table];
  
  for (const [table, actions] of Object.entries(sql)) {
    try {
      // INSERT           INTO configs (config, plugin, schema, scope)      VALUES ('DB_VERSION', 'dms-gui', 'DB_VERSION', 'dms-gui');
      // INSERT OR IGNORE INTO settings (name, value, configID, isMutable) VALUES ('settings', '${env.DMSGUI_VERSION}', 1, ${env.isImmutable});
      // so we have config = DB_VERSION, plugin = 'dms-gui', schema = 'DB_VERSION', scope = 'dms-gui', and a setting name = 'table' for each table
      // env:      `SELECT         s.value FROM settings s LEFT JOIN configs c ON s.configID = c.id WHERE 1=1 AND configID = (select id FROM configs WHERE c.name = ? AND plugin = @plugin) AND isMutable = ${env.isImmutable} AND s.name = ?`,
      result = dbGet(sql.configs.select.env, {plugin:'dms-gui'}, 'DB_VERSION', table);
      if (result.success) {
        db_version = (result.message) ? result.message.value : null;
        debugLog(`DB_VERSION ${table}=`, db_version);
        
      } else throw new Error(result?.error);
      
    } catch (error) {
      match = {
        get: {
          error:  error.message.match(sqlMatch.get.error),
        },
      }
      
      // column does not exist or smth like that... patch needed
      if (match.get.error) {
        debugLog(`DB_VERSION ${table}= PATCH NEEDED`);
        
      } else {
        errorLog(`DB_VERSION ${table}= ${error.code}: ${error.message}`);
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
            for (const [newVersion, patchLine] of Object.entries(patch.patches)) {
              try {
                result = dbRun(patchLine);
                if (result.success) {
                  successLog(`${table}: patch ${newVersion} from ${db_version} to ${patch.DB_VERSION}: success`);
                } else {
                  errorLog(`${table}: patch ${newVersion} from ${db_version} to ${patch.DB_VERSION}: ${result?.error}`);
                  // throw new Error(result?.error);
                }
                
              } catch (error) {
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
                  infoLog(`${table}: patch ${newVersion} from ${db_version} to ${patch.DB_VERSION}: skip`);
                
                // DROP COLUMN does not exist:
                } else if (match.drop.patch && match.drop.error && match.drop.patch[1].toUpperCase() == match.drop.error[1].toUpperCase()) {
                  infoLog(`${table}: patch ${newVersion} from ${db_version} to ${patch.DB_VERSION}: skip`);
                  
                } else {
                  errorLog(`${table}: patch ${newVersion} from ${db_version} to ${patch.DB_VERSION}: ${error.code}: ${error.message}`);
                  // throw error;
                }
              }
            }
            db_version = patch.DB_VERSION;
          }
        }
      }
    }

  }
  dbClose();
  dbOpen();
  infoLog(`${color.REV}${color.g}done`);
};

// ("ALTER TABLE logins ADD salt xxx".match(/ALTER[\s]+TABLE[\s]+[\"]?(\w+)[\"]?[\s]+ADD[\s]+(\w+)/i)[2] == 'column "salt" already exists'.match(/column[\s]+[\"]?(\w+)[\"]?[\s]+already[\s]+exists/i)[1])


// Function to generate a new IV for each encryption
export const generateIv = (bits) => {
  return crypto.randomBytes(bits || env.IV_LEN); // 16 bytes for AES-256-CBC
};

export const dbEncrypt = data => {
  const iv = generateIv();
  const cipher = crypto.createCipheriv(env.AES_ALGO, Buffer.from(key), iv);
  let encrypted = cipher.update(data, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  // Combine IV and encrypted data for storage
  return iv.toString('hex') + encrypted;
};

export const dbDecrypt = encryptedData => {
  const ivLength = env.IV_LEN * 2; // env.IV_LEN bytes * 2 for hex representation
  const iv = Buffer.from(encryptedData.slice(0, ivLength), 'hex');
  const ciphertext = encryptedData.slice(ivLength);
  const decipher = crypto.createDecipheriv(env.AES_ALGO, Buffer.from(key), iv);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
};

export const hashPassword = async (password='', salt='') => {
  return new Promise((resolve, reject) => {
    salt = (salt) ? salt: generateIv().toString('hex'); // Generate a random 16-byte salt
    crypto.scrypt(password, salt, env.HASH_LEN, (error, derivedKey) => { // env.HASH_LEN is the key length, 64 by default
      if (error) return reject(error);
      resolve({ salt, hash: derivedKey.toString('hex') }); // Store salt and hash as hex strings
    });
  });
};


// verifyPassword works the same wherever a table has a salted hash or 2 columns
// hardened against timing attacks
export const verifyPassword = async (password='', login) => {
  debugLog(`for ${login.username}`);
  
  let result = {success: false};
  try {

    // timing attacks protection
    if (password && login.salt && login.hash) {
      // 1. Re-hash the user's input password using the stored salt
      const { hash } = await hashPassword(password ?? '', login.salt);
      // return login.hash === hash; // vulnerable to timing attacks

      // 2. Convert both hexadecimal hashes into raw binary Buffers
      const storedHashBuffer = Buffer.from(login.hash, 'hex');
      const generatedHashBuffer = Buffer.from(hash, 'hex');

      // 3. Ensure buffers are identical in size to prevent runtime crashes
      if (storedHashBuffer.length !== generatedHashBuffer.length) {
        return false;
      }

      // 4. Secure constant-time comparison eliminates timing attacks
      result.success = crypto.timingSafeEqual(storedHashBuffer, generatedHashBuffer);
    
    // 
    } else {

      // Short-circuit timing protection: unneeded if you have fail2ban in your frontend
      // If user is not found, fake a hash operation so the server response 
      // takes the exact same amount of time as a valid user login attempt.
      await hashPassword(password ?? '', '00000000000000000000000000000000');
    }

    return result;

  } catch (error) {
    errorLog(error.message || error);
    throw new Error(error.message || error);
  }

};


// Function to update a password in a table
// for accounts: id=accounts.mailbox
// for logins: id=logins.key
export const changePassword = async (table, id, password, scope) => {
  let result;
  infoLog(`Call to update password for account id=${id} in table=${table} for scope=${scope}...`);

  try {
    const { salt, hash } = await hashPassword(password ?? '');
    
    // special case for accounts as we need to run a command in the container
    if (table == 'accounts') {
      debugLog(`Updating account password for id ${id} in ${scope}...`);

      result = await updateAccount('dms', scope, id, password);
      if (!result.success) {
        errorLog(result?.error);
        return { success: false, error: result?.error, returncode: result.returncode };
      }
    }
      
    // update password in local database
    debugLog(`Updating password for account id=${id} in table=${table} for scope=${scope}...`);
    result = dbRun(sql.logins.update.password, { salt:salt, hash:hash, scope:scope }, id);  // doesn't hurt to add scope even when unused
    if (result.success) {
      successLog(`Password updated for account id=${id} in table=${table} for scope=${scope}`);
      return { success: true, message: `Password updated for account id=${id} in table=${table} for scope=${scope}` };
      
    } else return result;
    
  } catch (error) {
    // errorLog(error.message || error);
    // throw new Error(error.message || error);
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// Function to update a table in the db; id can very well be an array as well
export const updateDB = async (table, id, jsonDict, scope, encrypt=false) => {  // jsonDict = { column:value, .. }
  const anonymizedJsonDict = (jsonDict?.password) ? {...jsonDict, password: '********'} : jsonDict;

  let result, scopedValues, value2test, testResult;
  let messages = [];
  let success = false;
  try {
    if (!sql[table]) {
      throw new Error(`unknown table ${table}`);
    }
    debugLog(`${table} ${sql[table].key}=${id} for scope=${scope}; encrypt=${encrypt}`, anonymizedJsonDict);
    
    if (!isNonEmptyDict(jsonDict)) {
      throw new Error('nothing to modify was passed');
    }
    
    // security: keep only keys defined in table.update[] == any column update is controled
    let validDict = reduxPropertiesOfObj(jsonDict, Object.keys(sql[table].keys));
    if (!isNonEmptyDict(validDict)) {
      errorLog(`jsonDict is invalid: ${JSON.stringify(jsonDict)} not in`, sql[table].keys); // only dump stuff in container log
      throw new Error(`jsonDict is invalid`);
    }
    
    // for each new value to update... example: logins { isActive: 0 }
    for (const [key, value] of Object.entries(validDict)) {
      
      // is the value the right type... as defined in the 'keys' section:
        // keys:   {
        //   mailbox:'string', 
        //   username:'string', 
        //   email:'string', 
        //   salt:'string', 
        //   hash:'string', 
        //   isAdmin:'number', 
        //   isActive:'number', 
        //   isAccount:'number', 
        //   mailserver:'string', 
        //   refreshToken:'string', 
        //   roles:'object',
        //   password:'string',
        // },
      if (typeof value == sql[table].keys[key]) {   // example: 0 or 1 are numbers so that's okay
        
        // password has its own function
        // for accounts: id=accounts.mailbox
        // for logins: id=logins.key
        if (key == 'password') {
          return changePassword(table, id, value, scope);
          
        // other sqlite3 valid types and we can test specific scenarios
        } else {
          
          // add named scope to the scopedValues, even if not used in the query it won't fail
          // scopedValues = (sql[table].scope) ? {[key]:value, scope:scope} : {[key]:value};
          // stringify arrays, dict, and null objects
          if (typeof value == 'object') {
            scopedValues = {[key]:JSON.stringify(value), scope:scope};

          } else {
            // updateDB logins id=10 for scope=undefined; encrypt=false { isActive: 0 } ==> that gives us scopedValues = {[isActive]:0, scope:undefined};
            scopedValues = {[key]:value, scope:scope};
          }
            
          // check if we have specifics before updating this key
          if (sql[table].update[key]) {   // sql.logins.update.isActive has {0, undefined}
              
            // is there a test for THAT value or ANY values?
            if (sql[table].update[key][value] || sql[table].update[key][undefined]) {  // sql.logins.update.isActive has {0 and 1}
              
              // swap the value2test for 'undefined' for values that have no test defined
              value2test = (sql[table].update[key][value]) ? value : undefined;
              
              // there is a test for THAT value and now we check with id in mind
              testResult = dbGet(sql[table].update[key][value2test].test, scopedValues, id);
              debugLog(`there is a test for ${table}.${key}=${value2test} and check(${testResult.message})=${sql[table].update[key][value2test].check(testResult.message)}`);
              
              // compare the result in the check function
              if (sql[table].update[key][value2test].check(testResult.message)) {
                
                // we pass the test, apply update
                if (encrypt) scopedValues[key] = dbEncrypt(scopedValues[key]);
                result = dbRun(sql[table].update[key][value2test].pass, scopedValues, id);
                if (result.success) {
                  messages.push(`Updated table ${table} ${sql[table].key}=${id} with ${key}=${value}`);
                  successLog(`Updated table ${table} ${sql[table].key}=${id} with ${key}=${value}`);
                  success = true;

                } else messages.push(result?.error);
                
              } else {
                // we do not pass the test
                errorLog(sql[table].update[key][value2test].fail);
                // return { success: false, error: sql[table].update[key][value2test].fail};
                messages.push(sql[table].update[key][value2test].fail);
              }
              
            // no test for any value of key, update the db with new value
            } else {
              if (encrypt) scopedValues[key] = dbEncrypt(scopedValues[key]);
              result = dbRun(sql[table].update[key], scopedValues, id);
              if (result.success) {
                messages.push(`Updated table ${table} ${sql[table].key}=${id} with ${key}=${value}`);
                successLog(`Updated table ${table} ${sql[table].key}=${id} with ${key}=${value}`);
                success = true;

              } else messages.push(result?.error);
            }
            
          } else {
            // errorLog(`sql[${table}].update is missing [${key}]`);
            // return { success: false, error: `sql[${table}].update is missing [${key}]`};

            if (encrypt) scopedValues[key] = dbEncrypt(scopedValues[key]);
            result = dbRun(`UPDATE ${table} set ${key} = @${key} WHERE 1=1 AND ${sql[table].key} = ?`, scopedValues, id);
            if (result.success) {
              messages.push(`Updated table ${table} ${sql[table].key}=${id} with ${key}=${value}`);
              successLog(`Updated table ${table} ${sql[table].key}=${id} with ${key}=${value}`);
              success = true;

            } else messages.push(result?.error);
          }
          
        }
        
      } else {
        errorLog(`typeof ${value} for ${key} is not ${sql[table].keys[key]}`);
        messages.push(`typeof ${value} for ${key} is not ${sql[table].keys[key]}`);
      }
    }
    // we can't just always return true and we should pass on the failure messages from the sql tests if any
    return success ? { success: true, message: messages.join ("; ") } : { success: false, error: messages.join ("; ") };
    
  } catch (error) {
    // errorLog(error.message || error);
    // throw new Error(error.message || error);
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


export const deleteEntry = async (table, id, key, scope=null) => {
  // example: deleteEntry('accounts', mailbox, 'mailbox', containerName);
  // example: deleteEntry('aliases', source, 'bySource', containerName);
  // example: deleteEntry('logins', id);

  let result, testResult;
  try {
    
    // use default key if not passed
    key = (key) ? key : sql[table].key;
    debugLog(`${table} ${key}=${id} for scope=${scope} and key=${key}`);
    
    // check if the sql is defined for the key to delete
    if (sql[table].delete[key]) {
      
      // add named scope to the scopedValues, even if not used in the query it won't fail
      // let scopedValues = (sql[table].scope) ? {scope:scope} : {};
      let scopedValues = {scope:scope};    // always add scope, why care? it's failproof
      
      // check if delete should be tested
      let hasTests = isNonEmptyDict(sql[table].delete[key]);
      // sql[table].delete[key].some(value => [id, undefined].includes(value));
      if (hasTests) {
        
        // fix the value2test as we may have tests for any values
        let value2test = (isNonEmptyDict(sql[table].delete[key][id])) ? id : undefined;
        
        // there is a test for THAT value and now we check with id in mind
        testResult = dbGet(sql[table].delete[key][value2test].test, scopedValues, id);
        debugLog(`there is a test for ${table}.${key}=${value2test} and check(${testResult.message})=${sql[table].delete[key][value2test].check(testResult.message)}`);
        
        // compare the result in the check function
        if (sql[table].delete[key][value2test].check(testResult.message)) {
          
          // we pass the test
          result = dbRun(sql[table].delete[key][value2test].pass, scopedValues, id);
          // { success: true, message: { changes: 4, lastInsertRowid: 0 } }
          if (result.success) {
            successLog(`${table} ${key}=${id} has deleted ${result.message.changes} rows`);
            return {success: true, message: `${table} ${key}=${id} has deleted ${result.message.changes} rows`};
            
          } else return result;
        
        } else {
          // we do not pass the test
          errorLog(sql[table].delete[key][value2test].fail);
          return { success: false, error: sql[table].delete[key][value2test].fail};
        }
        
      } else {
        // no test
        result = dbRun(sql[table].delete[key], scopedValues, id);
        // { success: true, message: { changes: 4, lastInsertRowid: 0 } }
        if (result.success) {
          successLog(`${table} ${key}=${id} has deleted ${result.message.changes} rows`);
          return {success: true, message: `${table} ${key}=${id} has deleted ${result.message.changes} rows`};
          
        } else return result;
      }
      
    } else {
      errorLog(`sql[${table}].delete is missing [${key}]`);
      return { success: false, error: `sql[${table}].delete is missing [${key}]`};
    }

  } catch (error) {
    // errorLog(error.message || error);
    // throw new Error(error.message || error);
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


export const resetTokens = async (id) => {

  let result;
  try {
    
    if (Number.isInteger(parseInt(id))) {
      result = dbRun(sql.logins.update.resetToken, {}, id);

    } else {
      result = dbRun(sql.logins.update.resetTokens);
    }
    if (result.success) {
      successLog(`${color.m}tokens deleted for user id=${id ?? '*'}`);
      return {success: true, message: `tokens deleted for user id=${id ?? '*'}`};
      
    } else return result;

  } catch (error) {
    // errorLog(error.message || error);
    // throw new Error(error.message || error);
    errorLog(error.message || error);
    throw new Error(error.message || error);
    // TODO: we should return smth to theindex API instead of throwing an error
    // return {
      // status: 'unknown',
      // error: error.message,
    // };
  }
};


// for testing, while settings table is empty, we shall be able to pass on all the settings as well
export const getTargetDict = (plugin=null, containerName=null, settings=[]) => {
  
  let result, schema;
  try {
    if (settings.length) {
      let targetDict = {
        containerName:  getValueFromArrayOfObj(settings, 'containerName'),
        protocol:       getValueFromArrayOfObj(settings, 'protocol'),
        host:           getValueFromArrayOfObj(settings, 'containerName'),
        port:           getValueFromArrayOfObj(settings, 'DMS_API_PORT'),
        Authorization:  getValueFromArrayOfObj(settings, 'DMS_API_KEY'),
        setupPath:      getValueFromArrayOfObj(settings, 'setupPath'),
        timeout:        getValueFromArrayOfObj(settings, 'timeout'),
        scope:          'dms-gui',
      }
      return targetDict;

    } else {
      // settings: `SELECT s.name, s.value FROM settings s LEFT JOIN configs c ON s.configID = c.id WHERE 1=1 AND configID = (select id FROM configs WHERE c.name = ? AND plugin = @plugin) AND isMutable = ${env.isMutable}`,
      // result = dbAll(sql.configs.select.settings, {plugin:plugin}, containerName);  // [{name:'protocol', value:'http'}, {name:'containerName', value:'dms'}, ..]
      // why calling dbAll again when getSettings does it?
      result = getSettings(plugin, containerName);

      // debugLog('ddebug result', result);
      // {
      //   success: true,
      //   message: [
      //     { name: 'schema', value: 'dms' },
      //     { name: 'protocol', value: 'http' },
      //     { name: 'containerName', value: 'dms' },
      //     { name: 'setupPath', value: '/usr/local/bin/setup' },
      //     { name: 'DMS_API_PORT', value: '8888' },
      //     { name: 'timeout', value: '4' },
      //     {
      //       name: 'DMS_API_KEY',
      //       value: 'dms-d6657c97-0000-0000-0000-3e3d43478f41'
      //     }
      //   ]
      // }
      
      if (result.success) schema = getValueFromArrayOfObj(result.message, 'schema');

      // debugLog(`plugins[${plugin}][${schema}]`, plugins[plugin][schema]);
      // {
      //   keys: {
      //     containerName: 'containerName',
      //     protocol: 'protocol',
      //     host: 'containerName',
      //     port: 'DMS_API_PORT',
      //     Authorization: 'DMS_API_KEY',
      //     setupPath: 'setupPath',
      //     timeout: 'timeout'
      //   },
      //   defaults: {
      //     containerName: 'dms',
      //     protocol: 'http',
      //     DMS_API_PORT: null,
      //     DMS_API_KEY: null,
      //     setupPath: '/usr/local/bin/setup',
      //     timeout: 4
      //   }
      // }

      if (result.success && result.message.length >= isNonEmptyDict(plugins[plugin][schema].keys)) {
        // limit results to protocol, host, port, and also Authorization but we add everything because we end up needing schema sometimes
        // we could use a for loop over plugins[plugin][schema].keys but then the code becomes hard to debug
        let targetDict = {
          containerName:  getValueFromArrayOfObj(result.message, 'containerName'),
          protocol:       getValueFromArrayOfObj(result.message, 'protocol'),
          host:           getValueFromArrayOfObj(result.message, 'containerName'),
          port:           getValueFromArrayOfObj(result.message, 'DMS_API_PORT'),
          Authorization:  getValueFromArrayOfObj(result.message, 'DMS_API_KEY'),
          setupPath:      getValueFromArrayOfObj(result.message, 'setupPath'),
          timeout:        getValueFromArrayOfObj(result.message, 'timeout'),
          schema:         schema,
          scope:          'dms-gui',
        }
        return targetDict;
      }
    }
    throw new Error(result?.error);

  } catch (error) {
    // errorLog(error.message || error);
    errorLog(error.message || error);
    dbOpen();
    return {success: false, error: error.message}
    // throw error;
  }
};


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
// DB.prepare("SELECT salt, hash FROM logins WHERE (mailbox = @mailbox OR username = @username)").get({"email":"admin","mailbox":"admin","username":"admin"})
// {
//   salt: 'fdebebcdcec4e534757a49473759355b',
//   hash: 'a975c7c1bf9783aac8b87e55ad01fdc4302254d234c9794cd4227f8c86aae7306bbeacf2412188f46ab6406d1563455246405ef0ee5861ffe2440fe03b271e18'
// }

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

// dbRun(`REPLACE INTO roles (username, mailbox, scope) VALUES (@username, @mailbox, ?)`, [{username:'user2',mailbox:'ops@domain.com'},{username:'user2',mailbox:'admin@domain.com'}], containerName)
// DB.prepare(`SELECT username, mailbox from roles WHERE 1=1 AND scope = @scope`).all(containerName)

// DB.prepare(`SELECT r.username, a.mailbox FROM accounts a LEFT JOIN roles r ON r.mailbox   = a.mailbox  WHERE 1=1 AND a.scope=r.scope AND a.scope = @scope`).all({scope:containerName})
// { username: 'user2', mailbox: 'ops@domain.com' },
// { username: 'user2', mailbox: 'admin@domain.com' }

// DB.prepare(`SELECT l.username, r.mailbox FROM logins l   LEFT JOIN roles r ON r.username  = l.username WHERE 1=1 AND r.scope = @scope`).all({scope:containerName})

// test and check:
// DB.prepare(`SELECT COUNT(isAdmin) value from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1`).get()  // { value: 2 }
// DB.prepare(`SELECT COUNT(isAdmin) value from logins WHERE 1=1 AND isActive = 1 AND isAdmin = 1 AND username IS NOT ?`).get('diane')

// DB.prepare(`SELECT COUNT(1) count`).get()
// { count: 1 }


// bug: leads to duplicate rows since we enabled PRIMARY key=id:
// DB.transaction("REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, @scope, 1)").run([{"name":"setupPath","value":"/usr/local/bin/setup","scope":"dms"},{"name":"env.DMS_CONFIG_PATH","value":"/tmp/docker-mailserver","scope":"dms"},{"name":"setupPath","value":"/usr/local/bin/setup","scope":"dms"},{"name":"env.DMS_CONFIG_PATH","value":"/tmp/docker-mailserver","scope":"dms"},{"name":"containerName","value":"dms","scope":"dms"}])
// DB.prepare("SELECT name, value FROM settings WHERE 1=1 AND isMutable = 1 AND scope = @scope").all({"scope":"dms"})
// DB.prepare("SELECT * FROM settings WHERE 1=1 AND isMutable = 1 AND scope = @scope").all({"scope":"dms"})
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

// warning: REPLACE changes and increments the row id
// If you want to update an existing row without changing its primary key, you should use an UPDATE statement instead of REPLACE INTO.
// result = DB.prepare("REPLACE INTO settings (name, value, scope, isMutable) VALUES (@name, @value, @scope, 1)").run({"name":"setupPath","value":"/usr/local/bin/setup","scope":"dmsss"})
// { changes: 1, lastInsertRowid: 388 }
// { changes: 1, lastInsertRowid: 389 }
// { changes: 1, lastInsertRowid: 390 }
// DB.prepare("SELECT * FROM settings where scope = ?").all(['dmsss'])
// [
//   ...,
//   {
//     id: 391,
//     name: 'setupPath',
//     value: '/usr/local/bin/setup',
//     scope: 'dmsss',
//     isMutable: 1
//   }
// ]
// result = DB.prepare("UPDATE settings set value = @value WHERE 1=1 AND name = @name AND scope = @scope").run({"name":"setupPath","value":"/usr/local/bin/setup","scope":"dmsss"})
// { changes: 1, lastInsertRowid: 0 }   // UPDATE + run will never return lastInsertRowid, but lastInsertRowid will be settothe last actual INSERT == wrong id
// result = DB.prepare("UPDATE settings set value = @value WHERE 1=1 AND name = @name AND scope = @scope RETURNING id").run({"name":"setupPath","value":"/usr/local/bin/setup","scope":"dmsss"})
  // { id: 393 }  // correct way for UPDATE: add RETURNING whatever and get -> not run

// `INSERT OR IGNORE INTO settings (name, value, scope) VALUES ('DKIM_PATH', 'xxx', 'dms') RETURNING id`

