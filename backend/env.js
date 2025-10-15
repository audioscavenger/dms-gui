const dotenv = require('dotenv');
dotenv.config({ path: '/app/config/.dms-gui.env' });
debug = (process.env.DEBUG === 'true') ? true : false;

// const { name, version, description } = require('./package.json');  
DMSGUI_VERSION = process.env.DMSGUI_VERSION;
DMSGUI_DESCRIPTION = process.env.DMSGUI_DESCRIPTION;
HOSTNAME = process.env.HOSTNAME;
NODE_ENV = process.env.NODE_ENV || 'production';
PORT_NODEJS = process.env.PORT_NODEJS || 3001;
TZ = process.env.TZ || 'UTC';

// Docker container name for docker-mailserver
DMS_CONTAINER = process.env.DMS_CONTAINER || 'dms';
SETUP_SCRIPT  = process.env.SETUP_SCRIPT || '/usr/local/bin/setup';
CONFIG_PATH   = process.env.CONFIG_PATH || '/app/config';
DB_Accounts   = CONFIG_PATH + '/db.accounts.json';
DB_Aliases    = CONFIG_PATH + '/db.aliases.json';
DB_Settings   = CONFIG_PATH + '/db.settings.json';
DB_Infos      = CONFIG_PATH + '/db.infos.json';
DB_Logins     = CONFIG_PATH + '/db.logins.json';
DATABASE      = CONFIG_PATH + '/dms-gui.sqlite3';

DMS_OPTIONS   = [
  'DMS_RELEASE',
  'ENABLE_RSPAMD',
  'ENABLE_XAPIAN',
  'ENABLE_MTA_STS',
  'PERMIT_DOCKER',
  'DOVECOT_MAILBOX_FORMAT',
  'POSTFIX_MAILBOX_SIZE_LIMIT',
];


module.exports={
  debug,
  DMSGUI_VERSION,
  DMSGUI_DESCRIPTION,
  HOSTNAME,
  NODE_ENV,
  PORT_NODEJS,
  TZ,
  DMS_CONTAINER,
  CONFIG_PATH,
  DB_Accounts,
  DB_Aliases,
  DB_Settings,
  DB_Infos,
  DB_Logins,
  DATABASE,
  DMS_OPTIONS,
}
