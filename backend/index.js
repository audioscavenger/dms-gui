require('./env');
const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('./backend');

const { 
  dbInit,
  updateDB,
  dbCount,
  deleteEntry,
} = require('./db');

const {
  getLogins,
  addLogin,
  loginUser,
  getRoles,
} = require('./logins');

const {
  getServerStatus,
  getServerInfos,
  getServerEnv,
  getServerEnvs,
  getSettings,
  saveSettings,
  getDomains,
} = require('./settings');

const {
  getAccounts,
  addAccount,
  deleteAccount,
  doveadm,
} = require('./accounts');

const {
  getAliases,
  addAlias,
  deleteAlias,
} = require('./aliases');

const express = require('express');
const qs = require('qs');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const app = express();


const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    version: DMSGUI_VERSION,
    title: 'dms-gui-backend',
    description: DMSGUI_DESCRIPTION,
  },
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ['./*.js'],
};
const oasDefinition = swaggerJsdoc(options);


// Middleware
app.use(cors());
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(oasDefinition));

// Parser
// https://www.codemzy.com/blog/parse-booleans-express-query-params
app.set('query parser', function (str) {
  return qs.parse(str, {
    decoder: function (str, defaultDecoder, charset, type) {
      let bools = {
        true: true,
        false: false,
      };
      if (type === 'value' && typeof bools[str] === "boolean") {
        return bools[str];
      } else {
        return defaultDecoder(str);
      }
    }
  })
});


// Routes
// @swagger descriptions based off https://swagger.io/docs/specification/v3_0/describing-parameters/
/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get server status
 *     description: Retrieve the status of the docker-mailserver
 *     responses:
 *       200:
 *         description: Server status
 *       500:
 *         description: Unable to connect to docker-mailserver
 */
app.get('/api/status', async (req, res) => {
  try {
    const status = await getServerStatus();
    res.json(status);
  } catch (error) {
    errorLog(`index /api/status: ${error.message}`);
    // res.status(500).json({ error: 'Unable to connect to docker-mailserver' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/infos:
 *   get:
 *     summary: Get server infos
 *     description: Retrieve the infos of the docker-mailserver
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         default: false
 *         schema:
 *           type: boolean
 *         description: pull data from DMS instead of local database
 *     responses:
 *       200:
 *         description: Server infos
 *       500:
 *         description: Unable to connect to docker-mailserver
 */
app.get('/api/infos', async (req, res) => {
  try {
    const refresh = ('refresh' in req.query) ? req.query.refresh : true;
    debugLog(`/api/infos?refresh=${req.query.refresh} -> ${refresh}`);
    const infos = await getServerInfos(refresh);
    res.json(infos);
  } catch (error) {
    errorLog(`index /api/infos: ${error.message}`);
    // res.status(500).json({ error: 'Unable to connect to docker-mailserver' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/env:
 *   get:
 *     summary: Get a single value
 *     description: Retrieve a single env value from DMS
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: pull env value from the db
 *     responses:
 *       200:
 *         description: env value when found
 *       500:
 *         description: Unable to retrieve env value
 */
app.get('/api/env', async (req, res) => {
  try {
    const name = ('name' in req.query) ? req.query.name : '';
    const value = await getServerEnv(name);
    res.json(value);
  } catch (error) {
    errorLog(`index GET /api/env: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve value' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/envs:
 *   get:
 *     summary: Get server envs
 *     description: Retrieve all the DMS envs we parsed
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         default: false
 *         schema:
 *           type: boolean
 *         description: pull data from DMS instead of local database
 *     responses:
 *       200:
 *         description: Server envs
 *       500:
 *         description: Unable to connect to docker-mailserver
 */
app.get('/api/envs', async (req, res) => {
  try {
    const refresh = ('refresh' in req.query) ? req.query.refresh : true;
    debugLog(`/api/envs?refresh=${req.query.refresh} -> ${refresh}`);
    const envs = await getServerEnvs(refresh);
    res.json(envs);
  } catch (error) {
    errorLog(`index /api/envs: ${error.message}`);
    // res.status(500).json({ error: 'Unable to connect to docker-mailserver' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for retrieving mailbox accounts
/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Get mailbox accounts
 *     description: Retrieve all mailbox accounts
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         default: false
 *         schema:
 *           type: boolean
 *         description: pull data from DMS instead of local database
 *     responses:
 *       200:
 *         description: List of mailbox accounts
 *       500:
 *         description: Unable to retrieve accounts
 */
app.get('/api/accounts', async (req, res) => {
  try {
    const refresh = ('refresh' in req.query) ? req.query.refresh : false;
    const accounts = await getAccounts(refresh);
    res.json(accounts);
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve accounts' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for adding a new mailbox account
/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Add a new mailbox account
 *     description: Add a new mailbox account to the docker-mailserver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mailbox:
 *                 type: string
 *                 format: email
 *                 description: mailbox address of the new account
 *               password:
 *                 type: string
 *                 description: Password for the new account
 *             required:
 *               - mailbox
 *               - password
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: mailbox and password are required
 *       500:
 *         description: Unable to create account
 */
app.post('/api/accounts', async (req, res) => {
  try {
    const { mailbox, password, createLogin } = req.body;
    if (!mailbox || !password) {
      return res.status(400).json({ error: 'Mailbox and password are required' });
    }
    const result = await addAccount(mailbox, password, createLogin);
    res.status(201).json(result);
    
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to create account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for doveadm command on mailbox
/**
 * @swagger
 * /api/doveadm/{command}/{mailbox}:
 *   put:
 *     summary: Execute doveadm command on mailbox
 *     description: Execute doveadm command on mailbox
 *     parameters:
 *       - in: path
 *         name: command
 *         required: true
 *         schema:
 *           type: string
 *         description: command to execute
 *       - in: path
 *         name: mailbox
 *         required: true
 *         schema:
 *           type: string
 *         description: mailbox to act upon
 *     responses:
 *       200:
 *         description: command executed successfully
 *       400:
 *         description: smth is missing
 *       500:
 *         description: See error message
 */
app.put('/api/doveadm/:command/:mailbox', async (req, res) => {
  try {
    const { command, mailbox } = req.params;
    if (!command || !mailbox) {
      return res.status(400).json({ error: 'Command and Mailbox are required' });
    }
    const result = await doveadm(command, mailbox, req.body);
    res.json(result);
    
  } catch (error) {
    errorLog(`PUT /api/doveadm/:command/:mailbox: ${error.message}`);
    // res.status(500).json({ error: 'Unable to execute doveadm' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for deleting a mailbox account
/**
 * @swagger
 * /api/accounts/{mailbox}:
 *   delete:
 *     summary: Delete a mailbox account
 *     description: Delete an mailbox account from the docker-mailserver
 *     parameters:
 *       - in: path
 *         name: mailbox
 *         required: true
 *         schema:
 *           type: string
 *         description: mailbox address of the account to delete
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: mailbox is required
 *       500:
 *         description: Unable to delete account
 */
app.delete('/api/accounts/:mailbox', async (req, res) => {
  try {
    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'Mailbox is required' });
    }
    const result = await deleteAccount(mailbox);
    res.json(result);
    
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to delete account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for updating a mailbox account; only password is covered atm
/**
 * @swagger
 * /api/accounts/{mailbox}/update:
 *   put:
 *     summary: Update an mailbox account
 *     description: Update an existing mailbox account
 *     parameters:
 *       - in: path
 *         name: mailbox
 *         required: true
 *         schema:
 *           type: string
 *         description: mailbox address of the account to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: New password for the account
 *     responses:
 *       200:
 *         description: Account updated successfully
 *       400:
 *         description: Account is required
 *       500:
 *         description: Unable to update account
 */
app.put('/api/accounts/:mailbox/update', async (req, res) => {
  try {
    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'Mailbox is required' });
    }

    // await updateAccount(mailbox, req.body);
    const result = await updateDB('accounts', mailbox, req.body);
    res.json(result);
    
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to update Account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for retrieving aliases
/**
 * @swagger
 * /api/aliases:
 *   get:
 *     summary: Get aliases
 *     description: Retrieve all email aliases
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         default: false
 *         schema:
 *           type: boolean
 *         description: pull data from DMS instead of local database
 *     responses:
 *       200:
 *         description: List of email aliases
 *       500:
 *         description: Unable to retrieve aliases
 */
app.get('/api/aliases', async (req, res) => {
  try {
    const refresh = ('refresh' in req.query) ? req.query.refresh : false;
    const aliases = await getAliases(refresh);
    res.json(aliases);
  } catch (error) {
    errorLog(`index /api/aliases: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve aliases' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for adding an alias
/**
 * @swagger
 * /api/aliases:
 *   post:
 *     summary: Add a new alias
 *     description: Add a new email alias to the docker-mailserver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *                 description: Source email address for the alias
 *               destination:
 *                 type: string
 *                 description: Destination email address for the alias
 *             required:
 *               - source
 *               - destination
 *     responses:
 *       201:
 *         description: Alias created successfully
 *       400:
 *         description: Source and destination are required
 *       500:
 *         description: Unable to create alias
 */
app.post('/api/aliases', async (req, res) => {
  try {
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res
        .status(400)
        .json({ error: 'Source and destination are required' });
    }
    const result = await addAlias(source, destination);
    res.status(201).json(result);
    
  } catch (error) {
    errorLog(`index /api/aliases: ${error.message}`);
    // res.status(500).json({ error: 'Unable to create alias' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for deleting an alias
/**
 * @swagger
 * /api/aliases/{source}/{destination}:
 *   delete:
 *     summary: Delete an alias
 *     description: Delete an email alias from the docker-mailserver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *                 description: Source email address for the alias
 *               destination:
 *                 type: string
 *                 description: Destination email address for the alias
 *     responses:
 *       200:
 *         description: Alias deleted successfully
 *       400:
 *         description: Source and destination are required
 *       500:
 *         description: Unable to delete alias
 */
app.delete('/api/aliases', async (req, res) => {
  try {
    // const { source, destination } = req.params;
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res
        .status(400)
        .json({ error: 'Source and destination are required' });
    }
    
    const result = await deleteAlias(source, destination);
    res.json(result);
    
  } catch (error) {
    errorLog(`DELETE /api/aliases: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for retrieving settings
/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get settings
 *     description: Retrieve all settings
 *     parameters:
 *       - in: query
 *         name: name
 *         required: false
 *         default: ''
 *         schema:
 *           type: string
 *         description: pull settings from the db
 *     responses:
 *       200:
 *         description: all settings even if empty
 *       500:
 *         description: Unable to retrieve settings
 */
app.get('/api/settings', async (req, res) => {
  try {
    const name = ('name' in req.query) ? req.query.name : '';
    const settings = await getSettings(name);
    res.json(settings);
  } catch (error) {
    errorLog(`GET /api/settings: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve settings' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for saving settings
/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: save settings
 *     description: save settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                  type: string
 *                 value:
 *                  type: string
 *             minItems: 1
 *             uniqueItems: true
 *     responses:
 *       201:
 *         description: settings saved successfully
 *       400:
 *         description: something is missing
 *       500:
 *         description: Unable to save settings
 */
app.post('/api/settings', async (req, res) => {
  try {
    const result = await saveSettings(req.body);     // [{name:name, value:value}, ..]
    res.status(201).json(result);
    
  } catch (error) {
    errorLog(`index POST /api/settings: ${error.message}`);
    // res.status(500).json({ error: 'Unable to save settings' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for retrieving roles
/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get roles
 *     description: Retrieve all roles
 *     responses:
 *       200:
 *         description: all roles even if empty
 *       500:
 *         description: Unable to retrieve roles
 */
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await getRoles();
    res.json(roles);
  } catch (error) {
    errorLog(`index GET /api/roles: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve roles' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for retrieving logins
/**
 * @swagger
 * /api/logins:
 *   get:
 *     summary: Get logins
 *     description: Retrieve all logins
 *     responses:
 *       200:
 *         description: all logins even if empty
 *       500:
 *         description: Unable to retrieve logins
 */
app.get('/api/logins', async (req, res) => {
  try {
    const logins = await getLogins();
    res.json(logins);
  } catch (error) {
    errorLog(`index GET /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve logins' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for adding logins
/**
 * @swagger
 * /api/logins:
 *   post:
 *     summary: add Login
 *     description: add Login in db
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the new login account
 *               username:
 *                 type: string
 *                 default: ''
 *                 description: Login name of the new login account
 *               password:
 *                 type: string
 *                 description: Password for the new login account
 *               isAdmin:
 *                 type: boolean
 *                 default: 0
 *                 description: Is the user an admin
 *               isActive:
 *                 type: boolean
 *                 default: 1
 *                 description: Is the user active
 *               roles:
 *                 type: array
 *                 default: []
 *                 description: mailboxes the user can manage
 *             required:
 *               - email
 *               - username
 *               - password
 *               - isAdmin
 *     responses:
 *       201:
 *         description: Login saved successfully
 *       400:
 *         description: Something is missing
 *       500:
 *         description: Unable to save Login
 */
app.post('/api/logins', async (req, res) => {
  try {
    const { email, username, password, isAdmin, isAccount, isActive, roles } = req.body;
    if (!email)     return res.status(400).json({ error: 'email is missing' });
    if (!username)  return res.status(400).json({ error: 'username is missing' });
    if (!password)  return res.status(400).json({ error: 'password is missing' });

    const result = await addLogin(email, username, password, isAdmin, isAccount, isActive, roles);
    res.status(201).json(result);
    
  } catch (error) {
    errorLog(`index POST /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to save Login' });
    res.status(500).json({ error: error.message });
  }
});

// https://swagger.io/docs/specification/v3_0/data-models/data-types/#objects
/**
 * @swagger
 * /api/logins/{email}/update:
 *   put:
 *     summary: Update a login data
 *     description: Update the data for an existing login account
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: email address of the login account to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: New email for the login account
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New email for the login account
 *               isAdmin:
 *                 type: integer
 *                 description: is login account admin
 *               isActive:
 *                 type: integer
 *                 description: de/activate login account
 *     responses:
 *       200:
 *         description: Data updated successfully
 *       400:
 *         description: email or data are required
 *       500:
 *         description: Unable to update login
 */
app.put('/api/logins/:email/update', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const result = await updateDB('logins', email, req.body);
    res.json(result);
    
  } catch (error) {
    errorLog(`index PUT /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to update login' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for deleting a login account
/**
 * @swagger
 * /api/logins/{email}:
 *   delete:
 *     summary: Delete a login account
 *     description: Delete a login account from dms-gui
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: email of the account to delete
 *     responses:
 *       200:
 *         description: Login deleted successfully
 *       400:
 *         description: email is required
 *       500:
 *         description: Unable to delete login
 */
app.delete('/api/logins/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    const result = await deleteEntry('logins', email, 'email');
    res.json(result);
    
  } catch (error) {
    errorLog(`index /api/login: ${error.message}`);
    // res.status(500).json({ error: 'Unable to delete login' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint to log in a user
/**
 * @swagger
 * /api/loginUser:
 *   post:
 *     summary: check credentials
 *     description: check credentials to log a user in
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Login username or email
 *               password:
 *                 type: string
 *                 description: Password
 *     responses:
 *       200:
 *         description: credentials valid
 *       400:
 *         description: Something is missing
 *       500:
 *         description: Unable to validate credentials
 */
app.post('/api/loginUser', async (req, res) => {
  try {
    const { credential, password } = req.body;
    if (!credential)  return res.status(400).json({ error: 'credential is missing' });
    if (!password)    return res.status(400).json({ error: 'password is missing' });

    const result = await loginUser(credential, password);
    res.json(result);
    
  } catch (error) {
    errorLog(`index POST /api/loginUser: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for retrieving domains
/**
 * @swagger
 * /api/domains:
 *   get:
 *     summary: Get domains
 *     description: Retrieve all domains
 *     parameters:
 *       - in: query
 *         name: name
 *         required: false
 *         default: ''
 *         schema:
 *           type: string
 *         description: pull domains from the db
 *     responses:
 *       200:
 *         description: all domains even if empty
 *       500:
 *         description: Unable to retrieve domains
 */
app.get('/api/domains', async (req, res) => {
  try {
    const name = ('name' in req.query) ? req.query.name : '';
    const domains = await getDomains(name);
    res.json(domains);
  } catch (error) {
    errorLog(`index GET /api/settings: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve domains' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for retrieving count of any table
/**
 * @swagger
 * /api/getCount/{table}:
 *   post:
 *     summary: Get count
 *     description: Get count from a table
 *     parameters:
 *       - in: query
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: Get count from a table
 *     responses:
 *       200:
 *         description: Return count from a table
 *       400:
 *         description: parameter table is missing
 *       500:
 *         description: Unable to count table
 */
app.post('/api/getCount/:table', async (req, res) => {
  try {
    // const table = ('table' in req.query) ? req.query.table : '';
    const { table } = req.params;
    if (!table) {
      return res.status(400).json({ error: 'table is required' });
    }

    const count = await dbCount(table);
    res.json(count);
  } catch (error) {
    errorLog(`index POST /api/getCount: ${error.message}`);
    // res.status(500).json({ error: 'Unable to count table' });
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT_NODEJS, async () => {
  infoLog(`dms-gui-backend ${DMSGUI_VERSION} Server ${process.version} running on port ${PORT_NODEJS}`);
  debugLog('🐞 debug mode is ENABLED');
  await dbInit();
  // currently we only set that up as default from here, and from saveSettings
  global.DMS_CONTAINER = await getSettings('containerName');
});
