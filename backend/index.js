require('./env.js');
const {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} = require('./backend.js');

const { dbInit } = require('./db');
const {
  getLogins,
  saveLogins,
} = require('./logins');
const {
  getServerStatus,
  getServerInfos,
  getSettings,
  saveSettings,
} = require('./settings');
const {
  getAccounts,
  addAccount,
  updateAccountPassword,
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

// Endpoint for retrieving email accounts
/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Get email accounts
 *     description: Retrieve all email accounts
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
 *         description: List of email accounts
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

// Endpoint for adding a new email account
/**
 * @swagger
 * /api/accounts:
 *   post:
 *     summary: Add a new email account
 *     description: Add a new email account to the docker-mailserver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address of the new account
 *               password:
 *                 type: string
 *                 description: Password for the new account
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Email and password are required
 *       500:
 *         description: Unable to create account
 */
app.post('/api/accounts', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await addAccount(email, password);
    res.status(201).json({ message: 'Account created successfully', email });
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to create account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for deleting an email account
/**
 * @swagger
 * /api/accounts/{email}:
 *   delete:
 *     summary: Delete an email account
 *     description: Delete an email account from the docker-mailserver
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address of the account to delete
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Email is required
 *       500:
 *         description: Unable to delete account
 */
app.delete('/api/accounts/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    await deleteAccount(email);
    res.json({ message: 'Account deleted successfully', email });
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to delete account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for reindexing an email account
/**
 * @swagger
 * /api/reindex/{email}:
 *   put:
 *     summary: Reindex an email account
 *     description: Reindex an email account by doveadm
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address of the account to reindex
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Email is required
 *       500:
 *         description: Unable to reindex account
 */
app.put('/api/reindex/:email', async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    await reindexAccount(email);
    res.json({ message: 'Reindex started for account', email });
  } catch (error) {
    errorLog(`index /api/reindex: ${error.message}`);
    // res.status(500).json({ error: 'Unable to reindex account' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for updating an email account password
/**
 * @swagger
 * /api/accounts/{email}/password:
 *   put:
 *     summary: Update an email account password
 *     description: Update the password for an existing email account
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Email address of the account to update
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
 *         description: Password updated successfully
 *       400:
 *         description: Email and password are required
 *       500:
 *         description: Unable to update password
 */
app.put('/api/accounts/:email/password', async (req, res) => {
  try {
    const { email } = req.params;
    const { password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    await updateAccountPassword(email, password);
    res.json({ message: 'Password updated successfully', email });
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    // res.status(500).json({ error: 'Unable to update password' });
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
    debugLog(`index /api/aliases: aliases=`,aliases);
    res.json(aliases);
  } catch (error) {
    errorLog(`ddebug index /api/aliases: ${error.message}`);
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
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *         description: Source email address of the alias to delete
 *       - in: path
 *         name: destination
 *         required: true
 *         schema:
 *           type: string
 *         description: Destination email address of the alias to delete
 *     responses:
 *       200:
 *         description: Alias deleted successfully
 *       400:
 *         description: Source and destination are required
 *       500:
 *         description: Unable to delete alias
 */
app.delete('/api/aliases/:source/:destination', async (req, res) => {
  try {
    const { source, destination } = req.params;
    if (!source) {
      return res.status(400).json({ error: 'Source is required' });
    }

    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
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
 *     responses:
 *       200:
 *         description: all settings even if empty
 *       500:
 *         description: Unable to retrieve settings
 */
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
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
 *             type: object
 *             properties:
 *               containerName:
 *                 type: string
 *               setupPath:
 *                 type: string
 *               dnsProvider:
 *                 type: string
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
    const { containerName, setupPath=SETUP_SCRIPT, dnsProvider='' } = req.body;
    if (!containerName) return res.status(400).json({ error: 'containerName is missing' });
    if (!setupPath) return res.status(400).json({ error: 'setupPath is missing' });

    const result = await saveSettings(containerName, setupPath, dnsProvider);
    res.status(201).json({ message: 'Settings saved successfully' });
  } catch (error) {
    errorLog(`index POST /api/settings: ${error.message}`);
    // res.status(500).json({ error: 'Unable to save settings' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for retrieving logins
/**
 * @swagger
 * /api/logins:
 *   get:
 *     summary: Get logins
 *     description: Retrieve all admin logins
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

// Endpoint for saving logins
/**
 * @swagger
 * /api/logins:
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
 *               email:
 *                 type: string
 *                 description: Email address of the new admin account
 *     responses:
 *       201:
 *         description: Admin credentials saved successfully
 *       400:
 *         description: Something is missing
 *       500:
 *         description: Unable to save Admin credentials
 */
app.post('/api/logins', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username)  return res.status(400).json({ error: 'username is missing' });
    if (!password)  return res.status(400).json({ error: 'password is missing' });
    if (!email)     email = '';

    const result = await saveLogins(username, password, email);
    res.status(201).json({ message: 'Admin credentials saved successfully' });
  } catch (error) {
    errorLog(`index POST /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to save Admin credentials' });
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT_NODEJS, async () => {
  infoLog(`dms-gui-backend ${DMSGUI_VERSION} Server ${process.version} running on port ${PORT_NODEJS}`);
  debugLog('🐞 debug mode is ENABLED');
  await dbInit();
});
