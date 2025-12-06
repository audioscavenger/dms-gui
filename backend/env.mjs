import dotenv from 'dotenv';
import crypto from 'node:crypto';

dotenv.config({ path: '/app/config/.dms-gui.env' });
export const env = {
  debug: (process.env.DEBUG === 'true') ? true : false,

  // const { name, version, description }: require('./package.json');
  DMSGUI_VERSION: (process.env.DMSGUI_VERSION.split("v").length == 2) ? process.env.DMSGUI_VERSION.split("v")[1] : process.env.DMSGUI_VERSION,
  DMSGUI_DESCRIPTION: process.env.DMSGUI_DESCRIPTION,
  HOSTNAME: process.env.HOSTNAME,
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT_NODEJS: process.env.PORT_NODEJS || 3001,
  TZ: process.env.TZ || 'UTC',

  // internals of dms-gui
  FRONTEND_URL  : process.env.FRONTEND_URL || '/api',     // for cors if you really are crazy with this sort of security
  API_URL  : process.env.API_URL || '/api',               // for cors too
  DMSGUI_CONFIG_PATH  : process.env.DMSGUI_CONFIG_PATH || '/app/config',
  DATABASE: (process.env.isDEMO === 'true') ? '/app/config/dms-gui-demo.sqlite3' : (process.env.DATABASE || '/app/config/dms-gui.sqlite3'),
  DATABASE_SAMPLE: '/app/config/dms-gui-example.sqlite3',
  DATABASE_SAMPLE_LIVE: '/app/config/dms-gui-demo.sqlite3',

  // some selectors in the DKIM UI
  DKIM_KEYTYPES: ['rsa','ed25519'],
  DKIM_KEYSIZES: ['1024','2048'],
  DKIM_KEYTYPE_DEFAULT: 'rsa',
  DKIM_KEYSIZE_DEFAULT: 2048,

  // variables we will capture from DMS 
  DMS_OPTIONS  : [
    'TZ',
    'DMS_RELEASE',
    'ENABLE_RSPAMD',
    'ENABLE_XAPIAN',
    'ENABLE_MTA_STS',
    'PERMIT_DOCKER',
    'DOVECOT_MAILBOX_FORMAT',
    'POSTFIX_MAILBOX_SIZE_LIMIT',
  ],

  isMutable: 1,
  isImmutable: 0,

  // other DMS internals
  DMS_SETUP_SCRIPT: ((process.env.DMS_SETUP_SCRIPT) ? process.env.DMS_SETUP_SCRIPT : '/usr/local/bin/setup'),
  DMS_CONFIG_PATH: ((process.env.DMS_CONFIG_PATH) ? process.env.DMS_CONFIG_PATH : '/tmp/docker-mailserver'),
  DKIM_SELECTOR_DEFAULT: ((process.env.DKIM_SELECTOR_DEFAULT) ? process.env.DKIM_SELECTOR_DEFAULT : 'mail'), // hardcoded in DMS
  protocol: "http",
  port: 8888,
  timeout: 4,
  containerName: "dms",

  // JWT_SECRET and JWT_SECRET_REFRESH regenerated when container starts, and will invalidates all sessions
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_SECRET_REFRESH: process.env.JWT_SECRET_REFRESH,
  // ACCESS_TOKEN_EXPIRY and REFRESH_TOKEN_EXPIRY control the behavior of the /loginUser and /refresh API
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '1h',
  REFRESH_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '7d',

  // IV_LEN is the length of the unique Initialization Vector (IV) = random salt used for encryption and hashing
  IV_LEN: Number(process.env.IV_LEN) || 16,
  // HASH_LEN is the length of the hashed keys for passwords
  HASH_LEN: Number(process.env.HASH_LEN) || 64,
  // encrypted data secret key, that one is set in the environment as well but shall never change
  // generate it once and for all with node or openssl:
  // // openssl rand -hex 32
  // // node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  AES_SECRET: process.env.AES_SECRET,
  // encrypted data algorithm
  AES_ALGO: process.env.AES_ALGO || 'aes-256-cbc',
  // AES_HASH is the used to hash the secret key
  AES_HASH: process.env.AES_HASH || 'sha512',
  // Derive a 256-bit key from your secretKey
  AES_KEY: crypto.createHash(process.env.AES_HASH || 'sha512').update(process.env.AES_SECRET).digest('hex').substring(0, 32),

  // doveadm API port, possible to especially with dovecot 2.4, but not used and likely never will
  // DOVEADM_PORT: ((process.env.DOVEADM_PORT) ? process.env.DOVEADM_PORT : 8080),

  // enable a daily restart of the container with this simple trick: default is 11PM
  //                                              ┌────────────── second (optional)
  //                                              │ ┌──────────── minute
  //                                              │ │ ┌────────── hour
  //                                              │ │ │  ┌──────── day of month
  //                                              │ │ │  │ ┌────── month
  //                                              │ │ │  │ │ ┌──── day of week
  //                                              │ │ │  │ │ │
  //                                              │ │ │  │ │ │
  //                                              * * *  * * *
  DMSGUI_CRON: (process.env.isDEMO === 'true') ? '6 7 *  * * *' : (process.env.DMSGUI_CRON || '* 1 23 * * *'),

  LOG_COLORS: (process.env.LOG_COLORS === 'false') ? false : true,

  // DEMO will activate a mock database and disable all refresh options
  isDEMO : (process.env.isDEMO === 'true') ? true : false,
  github : 'https://github.com/audioscavenger/dms-gui',
  wiki : 'https://github.com/audioscavenger/dms-gui',
  dockerhub : 'https://hub.docker.com/repositories/audioscavenger',

}

// we don't set any defaults here, as they will override whatever users set // cancelled, we only use the db
// export var live = {
  // // Docker container name for docker-mailserver  // cancelled
  // DMS_CONTAINER: process.env.DMS_CONTAINER,
  // containers: {},   // used to hold the DMS Docker.containers but we don't use docker.sock anymore


  // // DMS API key and port we need, to execute commands in DMS container; must be in DMS environement too // cancelled
  // DMS_API_KEY: process.env.DMS_API_KEY,
  // DMS_API_PORT: process.env.DMS_API_PORT,

// };

/*
  sh: {
    desc: 'python API server launcher - cancelled'
    path: DMSGUI_CONFIG_PATH + '/user-patches-api.sh',
    content:
`# this script is executed on startup

nohup /usr/bin/python3 $(dirname $0)/user-patches-api.py &
`,
  },
*/
export const userPatchesAPI = {
  py: {
    desc: 'python API server - mount this to /tmp/docker-mailserver/dms-gui/user-patches-api.py',
    path: env.DMSGUI_CONFIG_PATH + '/user-patches-api.py',
    content:
`#!/usr/bin/python3
# version=${env.DMSGUI_VERSION}

import http.server
import socketserver
import subprocess
import json
import os
import datetime

DMS_API_HOST = '0.0.0.0'                                                  # Listen on all available interfaces
DMS_API_PORT = int(os.environ.get('DMS_API_PORT', 8888))          # Port to listen on
DMS_API_KEY = os.environ.get('DMS_API_KEY', 'missing')            # generated by bms-gui on first start and added into DMS compose
timeout_default = 1                                               # can be superseeded by passed timeout in data
chunkSize = 1024                                                  # max bytes per request sent from dms-gui

def logger(message):
  # 2025-11-05T15:05:49.710284+00:00 mx dms-gui-api:
  print(f'{datetime.datetime.now().astimezone().strftime("%Y-%m-%dT%H:%M:%S.%f%z")} {os.uname().nodename.split(".")[0]} dms-gui-api: {message}')

class APIHandler(http.server.BaseHTTPRequestHandler):

  def do_POST(self):
    # 1. Get the content length from the headers
    api_key  = self.headers.get('Authorization', 'missing')
    content_length  = int(self.headers.get('Content-Length', 0))

    # 2. Read the raw POST data from the request body
    post_data = self.rfile.read(content_length)

    # 3. Attempt to parse the data as JSON
    try:
      json_data = json.loads(post_data.decode('utf-8'))
      # logger(f"Received JSON data: {json_data}")
      
      command = json_data.get('command')
      timeout = json_data.get('timeout', timeout_default)
      
      # logger(f"Received API Key: {api_key}")
      # logger(f"Received command: {command}")
      # logger(f"Received timeout: {timeout}")
    
      if api_key == DMS_API_KEY:
        if not command:
          response_message = {"status": "error", "error": "no command was passed"}
          logger(response_message['error'])
          
        else:
          try:
            # from here we could analyze and limit commands to be executed like remove unlink and rm, etc
            
            logger(f"Executing command: {command}")
            result = subprocess.run(command, 
                                     shell=True, 
                                     capture_output=True, # Capture stdout and stderr
                                     text=True,           # Decode stdout and stderr as text
                                     check=False,         # Do not raise an exception for non-zero exit codes
                                     timeout=timeout,     # timeout in seconds
                                    )
            # logger("ddebug: result: {result}")  #  CompletedProcess(args='/usr/local/bin/setup alias list', returncode=0, stdout='...
            
            response_message = {
              "status": "success",
              'returncode': result.returncode,
              'stdout': result.stdout,
              'stderr': result.stderr
            }
            # logger(f"ddebug: response_message: {response_message}")
            

          except Exception as e:
            response_message = {"status": "error", "error": str(e)}
            logger(response_message['error'])
          
      else:
        if DMS_API_KEY != 'missing':
          if api_key != missing:
            response_message = {"status": "error", "error": f"Missing api_key: api_miss"}
          else:
            response_message = {"status": "error", "error": f"Invalid api_key: api_error: {str(api_key)}"}
        else: 
          response_message = {"status": "error", "error": f"DMS api_key unset: api_unset"}
        logger(response_message['error'])

      # 4. Send a successful response
      self.send_response(200)
      self.send_header('Content-type', 'application/json')
      self.end_headers()
      #logger(f"response_message: {response_message}")
      self.wfile.write(json.dumps(response_message).encode('utf-8'))

    except json.JSONDecodeError:
      # 5. Handle invalid JSON
      self.send_response(400) # Bad Request
      self.send_header('Content-type', 'application/json')
      self.end_headers()
      response_message = {"status": "error", "message": "Invalid JSON format"}
      logger(f"response_message: {response_message}")
      self.wfile.write(json.dumps(response_message).encode('utf-8'))

    except Exception as e:
      # 6. Handle other potential errors
      self.send_response(500) # Internal Server Error
      self.send_header('Content-type', 'application/json')
      self.end_headers()
      response_message = {"status": "error", "message": str(e)}
      logger(f"response_message: {response_message}")
      self.wfile.write(json.dumps(response_message).encode('utf-8'))


with socketserver.TCPServer((DMS_API_HOST, DMS_API_PORT), APIHandler) as httpd:
  logger(f"Serving at port {DMS_API_HOST}:{DMS_API_PORT}")
  httpd.serve_forever()
`,
  },
  cron: {
    desc: 'https://github.com/orgs/docker-mailserver/discussions/2908 - mount this to /etc/supervisor/conf.d/user-patches-api.conf',
    path: env.DMSGUI_CONFIG_PATH + '/user-patches-api.conf',
    content:
`
[program:user-patches-api]
startsecs=1
stopwaitsecs=0
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/%(program_name)s.log
stderr_logfile=/var/log/supervisor/%(program_name)s.log
command=/usr/bin/python3 /tmp/docker-mailserver/dms-gui/user-patches-api.py
`,
  },
}


// https://github.com/orgs/docker-mailserver/discussions/2908
// Much better to just use a supervisord service config like I had shown over a month ago:

// /etc/supervisor/conf.d/dms-api.conf:

// [program:dms-api]
// startsecs=5
// stopwaitsecs=0
// autostart=true
// autorestart=true
// stdout_logfile=/var/log/supervisor/%(program_name)s.log
// stderr_logfile=/var/log/supervisor/%(program_name)s.log
// command=/usr/bin/python3 /tmp/docker-mailserver/user-patches-api.py


// plugins are only for settings where isMutable=1 and not the environment where isMutable=0 or anything else
// TODO: plugins and schemas should be in their own table really
export const plugins =
{
  "dms-gui": {
    DB_VERSION: {
      config: env.DMSGUI_VERSION,
      settings: env.DMSGUI_VERSION,
      logins: env.DMSGUI_VERSION,
      roles: env.DMSGUI_VERSION,
      accounts: env.DMSGUI_VERSION,
      aliases: env.DMSGUI_VERSION,
      domains: env.DMSGUI_VERSION,
      dns: env.DMSGUI_VERSION,
    },
  },

  // login: {
  //   profile: {
  //     mailbox:'mailbox',
  //     username:'username',
  //     email:'',
  //     salt:'',
  //     hash:'',
  //     isAdmin:0,
  //     isAccount:1,
  //     isActive:1,
  //     mailserver:'', 
  //     roles:[],
  //   },

  mailserver: {
    dms: {
      keys: {
        containerName: "containerName",
        protocol: "protocol",
        host: "containerName",
        port: "DMS_API_PORT",
        Authorization: "DMS_API_KEY",
        setupPath: "setupPath",
        timeout: "timeout",
      },
      defaults: {
        containerName: env.containerName,
        protocol: env.protocol,
        DMS_API_PORT: env.DMS_API_PORT,
        DMS_API_KEY: env.DMS_API_KEY,
        setupPath: env.DMS_SETUP_SCRIPT,
        timeout: env.timeout,
      },
    },
    dmsEnv: {
      DKIM_SELECTOR_DEFAULT: 'mail',
      ENABLE_MTA_STS: 1,
      ENABLE_RSPAMD: 1,
      DMS_RELEASE: 'v15.1.0',
      PERMIT_DOCKER: 'none',
      DOVECOT_MAILBOX_FORMAT: 'maildir',
      POSTFIX_MAILBOX_SIZE_LIMIT: 5242880000,
      TZ: 'UTC',
      DOVECOT_VERSION: '2.3.19.1',
      DOVECOT_FTS_PLUGIN: 'xapian',
      DOVECOT_FTS_AUTOINDEX: 'yes',
      DOVECOT_QUOTA: 1,
      DOVECOT_FTS: 1,
      DOVECOT_FTS_XAPIAN: 1,
      DOVECOT_ZLIB: 1,
      DKIM_ENABLED: 'true',
      DKIM_SELECTOR: 'dkim',
      DKIM_PATH: '/tmp/docker-mailserver/rspamd/dkim/rsa-2048-$selector-$domain.private.txt'
    },
  },

  dnscontrol: {
    "azure_private_dns_main": {
      "desc": "https://docs.dnscontrol.org/provider/azure_private_dns",
      "TYPE": "AZURE_PRIVATE_DNS",
      "SubscriptionID": "AZURE_PRIVATE_SUBSCRIPTION_ID",
      "ResourceGroup": "AZURE_PRIVATE_RESOURCE_GROUP",
      "TenantID": "AZURE_PRIVATE_TENANT_ID",
      "ClientID": "AZURE_PRIVATE_CLIENT_ID",
      "ClientSecret": "AZURE_PRIVATE_CLIENT_SECRET"
    },
    "cloudflare": {
      "desc": "https://docs.dnscontrol.org/provider/cloudflareapi",
      "TYPE": "CLOUDFLAREAPI",
      "accountid": "your-cloudflare-account-id",
      "apitoken": "your-cloudflare-api-token"
    },
    "oracle": {
      "desc": "https://docs.dnscontrol.org/provider/cloudflareapi",
      "TYPE": "ORACLE",
      "compartment": "$ORACLE_COMPARTMENT",
      "fingerprint": "$ORACLE_FINGERPRINT",
      "private_key": "$ORACLE_PRIVATE_KEY",
      "region": "$ORACLE_REGION",
      "tenancy_ocid": "$ORACLE_TENANCY_OCID",
      "user_ocid": "$ORACLE_USER_OCID"
    },
    "r53_main": {
      "desc": "https://docs.dnscontrol.org/provider/route53",
      "TYPE": "ROUTE53",
      "DelegationSet": "optional-delegation-set-id",
      "KeyId": "your-aws-key",
      "SecretKey": "your-aws-secret-key",
      "Token": "optional-sts-token"
    },
  }
}

export const command = {
  "dms-gui": {
    "dms-gui": {
      kill: `sleep 1 && kill -9 $(pgrep "master process nginx")`,
    },
  },

  mailserver: {
    dms: {
      kill: `sleep 1 && kill -9 $(pgrep "supervisord")`,
    }
  }
};
