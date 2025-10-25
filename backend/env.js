const dotenv = require('dotenv');
dotenv.config({ path: '/app/config/.dms-gui.env' });
debug = (process.env.DEBUG === 'true') ? true : false;

// const { name, version, description } = require('./package.json');
DMSGUI_VERSION = (process.env.DMSGUI_VERSION.split("v").length == 2) ? process.env.DMSGUI_VERSION.split("v")[1] : process.env.DMSGUI_VERSION;
DMSGUI_DESCRIPTION = process.env.DMSGUI_DESCRIPTION;
HOSTNAME = process.env.HOSTNAME;
NODE_ENV = process.env.NODE_ENV || 'production';
PORT_NODEJS = process.env.PORT_NODEJS || 3001;
TZ = process.env.TZ || 'UTC';

DMSGUI_CONFIG_PATH   = process.env.DMSGUI_CONFIG_PATH || '/app/config';
DB_Accounts   = DMSGUI_CONFIG_PATH + '/db.accounts.json';
DB_Aliases    = DMSGUI_CONFIG_PATH + '/db.aliases.json';
DB_Settings   = DMSGUI_CONFIG_PATH + '/db.settings.json';
DB_Infos      = DMSGUI_CONFIG_PATH + '/db.infos.json';
DB_Logins     = DMSGUI_CONFIG_PATH + '/db.logins.json';
DATABASE      = DMSGUI_CONFIG_PATH + '/dms-gui.sqlite3';

// Docker container name for docker-mailserver
DMS_CONTAINER = (typeof DMS_CONTAINER) ? process.env.DMS_CONTAINER : DMS_CONTAINER;
containers = (typeof containers) ? {} : containers;

DMS_SETUP_SCRIPT  = process.env.DMS_SETUP_SCRIPT || '/usr/local/bin/setup';
DMS_CONFIG_PATH = process.env.DMS_CONFIG_PATH || '/tmp/docker-mailserver';
DKIM_SELECTOR_DEFAULT = 'mail';

DKIM_KEYTYPES = ['rsa','ed25519'];
DKIM_KEYSIZES = ['1024','2048'];
DKIM_KEYTYPE_DEFAULT = 'rsa';
DKIM_KEYSIZE_DEFAULT = 2048;

DMS_OPTIONS   = [
  'DMS_RELEASE',
  'ENABLE_RSPAMD',
  'ENABLE_XAPIAN',
  'ENABLE_MTA_STS',
  'PERMIT_DOCKER',
  'DOVECOT_MAILBOX_FORMAT',
  'POSTFIX_MAILBOX_SIZE_LIMIT',
];

isMutable = 1;
isImmutable = 0;

// all undeclared variable are exported as is
// module.exports={
  // debug,
  // DMSGUI_VERSION,
  // DMSGUI_DESCRIPTION,
  // HOSTNAME,
  // NODE_ENV,
  // PORT_NODEJS,
  // TZ,
  // DMS_CONTAINER,
  // DMSGUI_CONFIG_PATH,
  // DB_Accounts,
  // DB_Aliases,
  // DB_Settings,
  // DB_Infos,
  // DB_Logins,
  // DATABASE,
// }

