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
} = require('./db');

const {
  getLogins,
  addLogin,
  deleteLogin,
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

// Endpoint for retrieving settings
/**
 * @swagger
 * /api/env:
 *   get:
 *     summary: Get DMS env value
 *     description: Retrieve a single env value
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
 *     description: Retrieve the envs of the docker-mailserver
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
    const { mailbox, password } = req.body;
    if (!mailbox || !password) {
      return res.status(400).json({ error: 'Mailbox and password are required' });
    }
    const result = await addAccount(mailbox, password);
    res.status(201).json({ message: 'Account created successfully', mailbox });
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to create account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for reindexing an mailbox account
/**
 * @swagger
 * /api/reindex/{mailbox}:
 *   put:
 *     summary: Reindex an mailbox account
 *     description: Reindex an mailbox account by doveadm
 *     parameters:
 *       - in: path
 *         name: mailbox
 *         required: true
 *         schema:
 *           type: string
 *         description: mailbox address of the account to reindex
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: mailbox is required
 *       500:
 *         description: Unable to reindex account
 */
app.put('/api/reindex/:mailbox', async (req, res) => {
  try {
    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'Mailbox is required' });
    }
    await reindexAccount(mailbox);
    res.json({ message: 'Reindex started for account', mailbox });
    
  } catch (error) {
    errorLog(`index /api/reindex: ${error.message}`);
    // res.status(500).json({ error: 'Unable to reindex account' });
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
    await deleteAccount(mailbox);
    res.json({ message: 'Account deleted successfully', mailbox });
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to delete account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for updating an mailbox account
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
    await updateDB('accounts', mailbox, req.body);
    res.json({ message: 'Account updated successfully', mailbox });
    
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
    await addAlias(source, destination);
    res
      .status(201)
      .json({ message: 'Alias created successfully', source, destination });
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
    
    await deleteAlias(source, destination);
    res.json({ message: 'Alias deleted successfully', source, destination });
  } catch (error) {
    errorLog(`index /api/aliases: ${error.message}`);
    // res.status(500).json({ error: 'Unable to delete alias' });
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
    errorLog(`index GET /api/settings: ${error.message}`);
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
    res.status(201).json({ message: 'Settings saved successfully' });
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
 *               username:
 *                 type: string
 *                 description: Login name of the new login account
 *               password:
 *                 type: string
 *                 description: Password for the new login account
 *               email:
 *                 type: string
 *                 format: email
 *                 default: ''
 *                 description: Email address of the new login account
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
    const { username, password, email, isAdmin, isActive, roles } = req.body;
    if (!username)  return res.status(400).json({ error: 'username is missing' });
    if (!password)  return res.status(400).json({ error: 'password is missing' });

    const result = await addLogin(username, password, email, isAdmin, isActive, roles);
    res.status(201).json({ message: 'Login saved successfully' });
  } catch (error) {
    errorLog(`index POST /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to save Login' });
    res.status(500).json({ error: error.message });
  }
});

// https://swagger.io/docs/specification/v3_0/data-models/data-types/#objects
/**
 * @swagger
 * /api/logins/{username}/update:
 *   put:
 *     summary: Update a login data
 *     description: Update the data for an existing login account
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username address of the login account to update
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
 *         description: Username or data are required
 *       500:
 *         description: Unable to update login
 */
app.put('/api/logins/:username/update', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    await updateDB('logins', username, req.body);
    res.json({ message: 'Login updated successfully', username });
    
  } catch (error) {
    errorLog(`index PUT /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to update login' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for deleting a login account
/**
 * @swagger
 * /api/logins/{username}:
 *   delete:
 *     summary: Delete a login account
 *     description: Delete a login account from dms-gui
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username of the account to delete
 *     responses:
 *       200:
 *         description: Login deleted successfully
 *       400:
 *         description: Username is required
 *       500:
 *         description: Unable to delete login
 */
app.delete('/api/logins/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    await deleteLogin(username);
    res.json({ message: 'Login deleted successfully', username });
  } catch (error) {
    errorLog(`index /api/login: ${error.message}`);
    // res.status(500).json({ error: 'Unable to delete login' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint to log in a user; API calls would use maybe a different method
/**
 * @swagger
 * /api/loginUser:
 *   post:
 *     summary: save Admin credentials
 *     description: save Admin credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Login name of the new admin account
 *               password:
 *                 type: string
 *                 description: Password for the new admin account
 *     responses:
 *       201:
 *         description: Admin credentials saved successfully
 *       400:
 *         description: Something is missing
 *       500:
 *         description: Unable to save Admin credentials
 */
app.post('/api/loginUser', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username)  return res.status(400).json({ error: 'username is missing' });
    if (!password)  return res.status(400).json({ error: 'password is missing' });

    const result = await loginUser(username, password);
    res.status(201).json(result);
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
    res.json(settings);
  } catch (error) {
    errorLog(`index GET /api/settings: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve settings' });
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
