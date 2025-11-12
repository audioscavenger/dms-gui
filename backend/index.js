import {
  debugLog,
  errorLog,
  infoLog,
} from './backend.mjs';
import {
  env
} from './env.mjs';

import {
  dbCount,
  dbInit,
  deleteEntry,
  updateDB,
} from './db.mjs';

import {
  addLogin,
  getLogins,
  getRoles,
  loginUser,
} from './logins.mjs';

import {
  getDomains,
  getNodeInfos,
  getScopes,
  getServerEnvs,
  getServerStatus,
  getSettings,
  initAPI,
  saveSettings,
} from './settings.mjs';

import {
  addAccount,
  deleteAccount,
  doveadm,
  getAccounts,
} from './accounts.mjs';

import {
  addAlias,
  deleteAlias,
  getAliases,
} from './aliases.mjs';

// const express = require('express');
// const app = express();
// const qs = require('qs');
// const cors = require('cors');
// const swaggerUi = require('swagger-ui-express');
// const swaggerJsdoc = require('swagger-jsdoc');
// const jwt = require('jsonwebtoken');

import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import qs from 'qs';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
const app = express();

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    version: env.DMSGUI_VERSION,
    title: 'dms-gui-backend',
    description: env.DMSGUI_DESCRIPTION,
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


// Routes ------------------------------------------------------------------------------------------
// @swagger descriptions based off https://swagger.io/docs/specification/v3_0/describing-parameters/


/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get server status
 *     description: Retrieve the status of the docker-mailserver
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
 *     responses:
 *       200:
 *         description: Server status
 *       500:
 *         description: Unable to connect to docker-mailserver
 */
app.get('/api/status/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    const test = ('test' in req.query) ? req.query.test : undefined;

    const status = await getServerStatus(containerName, test);
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
 *     responses:
 *       200:
 *         description: Server infos
 *       500:
 *         description: Unable to connect to docker-mailserver
 */
app.get('/api/infos', async (req, res) => {
  try {
    const infos = await getNodeInfos();
    res.json(infos);
  } catch (error) {
    errorLog(`index /api/infos: ${error.message}`);
    // res.status(500).json({ error: 'Unable to connect to docker-mailserver' });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/envs:
 *   get:
 *     summary: Get server envs
 *     description: Retrieve all the DMS envs we parsed or just one
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
 *       - in: query
 *         name: refresh
 *         required: false
 *         default: false
 *         schema:
 *           type: boolean
 *         description: pull data from DMS instead of local database
 *       - in: query
 *         name: name
 *         required: false
 *         default: undefined
 *         schema:
 *           type: string
 *         description: pull data from DMS instead of local database
 *     responses:
 *       200:
 *         description: Server envs
 *       400:
 *         description: Something is missing
 *       500:
 *         description: Unable to connect to docker-mailserver
 */
app.get('/api/envs/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const refresh = ('refresh' in req.query) ? req.query.refresh : false;
    const name = ('name' in req.query) ? req.query.name : undefined;
    const envs = await getServerEnvs(containerName, refresh, name);
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
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.get('/api/accounts/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const refresh = ('refresh' in req.query) ? req.query.refresh : false;
    const accounts = await getAccounts(containerName, refresh);
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
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.post('/api/accounts/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const { mailbox, password, createLogin } = req.body;
    if (!mailbox || !password) {
      return res.status(400).json({ error: 'Mailbox and password are required' });
    }
    const result = await addAccount(containerName, mailbox, password, createLogin);
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
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.put('/api/doveadm/:containerName/:command/:mailbox', async (req, res) => {
  try {
    const { containerName, command, mailbox } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    if (!command || !mailbox) return res.status(400).json({ error: 'Command and Mailbox are required' });
    
    const result = await doveadm(containerName, command, mailbox, req.body);
    res.json(result);
    
  } catch (error) {
    errorLog(`PUT /api/doveadm/:containerName/:command/:mailbox: ${error.message}`);
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
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.delete('/api/accounts/:containerName/:mailbox', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'Mailbox is required' });
    }
    const result = await deleteAccount(containerName, mailbox);
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
 *   patch:
 *     summary: Update an mailbox account
 *     description: Update an existing mailbox account
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.patch('/api/accounts/:containerName/:mailbox/update', async (req, res) => {
  try {
    const { containerName, mailbox } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    if (!mailbox)       return res.status(400).json({ error: 'Mailbox is required' });

    const result = await updateDB('accounts', mailbox, req.body, containerName);
    res.json(result);
    
  } catch (error) {
    errorLog(`index PATCH /api/accounts: ${error.message}`);
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
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.get('/api/aliases/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const refresh = ('refresh' in req.query) ? req.query.refresh : false;
    const aliases = await getAliases(containerName, refresh);
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
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.post('/api/aliases/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const { source, destination } = req.body;
    if (!source || !destination) {
      return res
        .status(400)
        .json({ error: 'Source and destination are required' });
    }
    const result = await addAlias(containerName, source, destination);
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
 * /api/aliases:
 *   delete:
 *     summary: Delete an alias
 *     description: Delete an email alias from the docker-mailserver
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.delete('/api/aliases/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const { source, destination } = req.body;
    if (!source || !destination) {
      return res
        .status(400)
        .json({ error: 'Source and destination are required' });
    }
    
    const result = await deleteAlias(containerName, source, destination);
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
 *     description: Retrieve all or 1 settings
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
 *       - in: query
 *         name: name
 *         required: false
 *         default: undefined
 *         schema:
 *           type: string
 *         description: pull 1 setting from the db
 *     responses:
 *       200:
 *         description: all or 1 settings even if empty
 *       500:
 *         description: Unable to retrieve settings
 */
app.get('/api/settings/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    const name = ('name' in req.query) ? req.query.name : undefined;
    debugLog(`ddebug containerName=${containerName} ${typeof containerName} name=${name} ${typeof name} ------------------------------------------`)
    const settings = await getSettings(containerName, name);
    res.json(settings);
    
  } catch (error) {
    errorLog(`GET /api/settings: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve settings' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for retrieving scopes
/**
 * @swagger
 * /api/scopes:
 *   get:
 *     summary: Get scopes other then dms-gui
 *     description: Get scopes other then dms-gui = DMS containers in settings
 *     responses:
 *       200:
 *         description: all scopes or empty array
 *       500:
 *         description: Unable to retrieve scopes
 */
app.get('/api/scopes', async (req, res) => {
  try {
    const scopes = await getScopes();
    res.json(scopes);
    
  } catch (error) {
    errorLog(`GET /api/scopes: ${error.message}`);
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
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
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
app.post('/api/settings/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    
    debugLog('ddebug --------------------------------- saveSettings')
    const result = await saveSettings(containerName, req.body);     // req.body = [{name:name, value:value}, ..]
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
 *     summary: Get user roles
 *     description: Retrieve all roles from a user
 *     parameters:
 *       - in: path
 *         name: credential
 *         required: true
 *         schema:
 *           type: string
 *         description: login credential = mailbox or username
 *     responses:
 *       200:
 *         description: all roles even if empty
 *       500:
 *         description: Unable to retrieve roles
 */
app.get('/api/roles/:credential', async (req, res) => {
  try {
    const { credential } = req.params;
    if (!credential) return res.status(400).json({ error: 'credential is required' });
    
    const roles = await getRoles(credential);
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
 *   post:
 *     summary: Get logins
 *     description: Retrieve all or 1 logins
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: string
 *             minItems: 0
 *             uniqueItems: false
 *     responses:
 *       200:
 *         description: all logins even if empty
 *       500:
 *         description: Unable to retrieve logins
 */
app.post('/api/logins', async (req, res) => {
  try {
    const { credentials } = req.body;
    debugLog('ddebug req.body', credentials);
    const logins = await getLogins(credentials);
    res.json(logins);
    
  } catch (error) {
    errorLog(`index POST /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve logins' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for adding logins
/**
 * @swagger
 * /api/logins:
 *   put:
 *     summary: add Login
 *     description: add Login in db
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
 *                 description: mailbox address of the new login account
 *               username:
 *                 type: string
 *                 default: ''
 *                 description: Login name of the new login account
 *               email:
 *                 type: string
 *                 format: email
 *                 description: external email address for password recovery
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
 *               - mailbox
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
app.put('/api/logins', async (req, res) => {
  try {
    const { mailbox, username, password, email, isAdmin, isAccount, isActive, roles } = req.body;
    if (!mailbox)     return res.status(400).json({ error: 'mailbox is missing' });
    if (!username)  return res.status(400).json({ error: 'username is missing' });
    if (!password)  return res.status(400).json({ error: 'password is missing' });

    const result = await addLogin(mailbox, username, password, email, isAdmin, isAccount, isActive, roles);
    res.status(201).json(result);
    
  } catch (error) {
    errorLog(`index PUT /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to save Login' });
    res.status(500).json({ error: error.message });
  }
});

// https://swagger.io/docs/specification/v3_0/data-models/data-types/#objects
/**
 * @swagger
 * /api/logins/{mailbox}/update:
 *   patch:
 *     summary: Update a login data
 *     description: Update the data for an existing login account
 *     parameters:
 *       - in: path
 *         name: mailbox
 *         required: true
 *         schema:
 *           type: string
 *         description: mailbox address of the login account to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: New password for the login account
 *               mailbox:
 *                 type: string
 *                 format: email
 *                 description: New mailbox for the login account
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
 *         description: mailbox or data are required
 *       500:
 *         description: Unable to update login
 */
app.patch('/api/logins/:mailbox/update', async (req, res) => {
  try {
    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'mailbox is required' });
    }

    debugLog('ddebug index PATCH /api/logins/${mailbox}/update req.body', req.body);
    const result = await updateDB('logins', mailbox, req.body);
    debugLog(`index PATCH /api/logins/${mailbox}/update`, result)
    res.json(result);
    
  } catch (error) {
    errorLog(`index PATCH /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to update login' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for deleting a login account
/**
 * @swagger
 * /api/logins/{mailbox}:
 *   delete:
 *     summary: Delete a login account
 *     description: Delete a login account from dms-gui
 *     parameters:
 *       - in: path
 *         name: mailbox
 *         required: true
 *         schema:
 *           type: string
 *         description: mailbox of the account to delete
 *     responses:
 *       200:
 *         description: Login deleted successfully
 *       400:
 *         description: mailbox is required
 *       500:
 *         description: Unable to delete login
 */
app.delete('/api/logins/:mailbox', async (req, res) => {
  try {
    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'mailbox is required' });
    }
    const result = await deleteEntry('logins', mailbox, 'mailbox');
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
 *                 description: Login username or mailbox
 *               password:
 *                 type: string
 *                 description: Password
 *     responses:
 *       200:
 *         description: credentials valid
 *       400:
 *         description: Something is missing
 *       401:
 *         description: login denied
 *       500:
 *         description: Unable to validate credentials
 */
app.post('/api/loginUser', async (req, res) => {
  try {
    const { credential, password } = req.body;
    if (!credential)  return res.status(400).json({ error: 'credential is missing' });
    if (!password)    return res.status(400).json({ error: 'password is missing' });

    const user = await loginUser(credential, password);
    debugLog('user', user);
    
    if (user) {
      const accessToken = jwt.sign(user, env.SECRET_KEY, { expiresIn: env.SECRET_KEY_EXPIRY });
      // debugLog('accessToken', accessToken);
      
      // Bearer token, in-memory/useState or localStorage:
      // res.json({accessToken});
      
      // HTTP-Only Cookies (for Refresh Tokens):
      res.cookie('jwt', accessToken, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', // Use secure in production
        sameSite: 'Lax',  // 'None' or 'Lax' or 'Strict' (for CSRF protection)
        maxAge: 3600000   // 1h
      });
      // and we still send user's information because roles etc
      res.json(user);
      
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }

  } catch (error) {
    errorLog(`index POST /api/loginUser: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to logout and clear cookie
/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: logout
 *     description: logout and clear cookie
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: logout valid
 *       400:
 *         description: Something is wrong
 *       500:
 *         description: Unable to logout
 */
app.post('/api/logout', async (req, res) => {
  try {
    res.clearCookie('jwt', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', // Set to true in production
      sameSite: 'Lax', // 'None' or 'Lax' or 'Strict' (for CSRF protection)
      path: '/' 
    });
    
    res.json({ success: true });
    
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
 *     summary: Get domain(s)
 *     description: Retrieve 1 or all domains
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
 *       - in: path
 *         name: name
 *         required: false
 *         default: undefined
 *         schema:
 *           type: string
 *         description: pull domains from the db
 *     responses:
 *       200:
 *         description: all domains even if empty
 *       400:
 *         description: Something is missing
 *       500:
 *         description: Unable to retrieve domains
 */
app.get('/api/domains/:containerName/:domain', async (req, res) => {
  try {
    const { containerName, domain } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const domains = await getDomains(containerName, domain);
    res.json(domains);
    
  } catch (error) {
    errorLog(`index GET /api/domains/${domain}/${containerName}: ${error.message}`);
    // res.status(500).json({ error: 'Unable to retrieve domains' });
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for retrieving count of any table
/**
 * @swagger
 * /api/getCount/{table}:
 *   get:
 *     summary: Get count
 *     description: Get count from a table
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *         description: Get count from a table
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               containerName:
 *                 type: string
 *                 description: containerName
 *     responses:
 *       200:
 *         description: Return count from a table
 *       400:
 *         description: parameter table is missing
 *       500:
 *         description: Unable to count table
 */
app.get('/api/getCount/:table/:containerName', async (req, res) => {
  try {
    const { table, containerName } = req.params;
    if (!table) return res.status(400).json({ error: 'table is required' });
    
    const count = await dbCount(table, containerName);
    res.json(count);
    
  } catch (error) {
    errorLog(`index GET /api/getCount: ${error.message}`);
    // res.status(500).json({ error: 'Unable to count table' });
    res.status(500).json({ error: error.message });
  }
});


// Endpoint for pushing/getting DMS_API_KEY
/**
 * @swagger
 * /api/initAPI:
 *   post:
 *     summary: Provide or regenerate DMS_API_KEY
 *     description: Provide or regenerate DMS_API_KEY + API scripts
 *     parameters:
 *       - in: path
 *         name: containerName
 *         required: true
 *         schema:
 *           type: string
 *         description: DMS containerName
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dms_api_key_param:
 *                 type: string
 *                 description: DMS API key to use or 'regen' to  get a new one
 *     responses:
 *       200:
 *         description: DMS_API_KEY from db
 *       400:
 *         description: Something is missing
 *       500:
 *         description: Unable to generate DMS_API_KEY
 */
app.post('/api/initAPI/:containerName', async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    const { dms_api_key_param } = req.body;
    
    const dms_api_key_response = await initAPI(containerName, dms_api_key_param);
    res.json(dms_api_key_response);
    
  } catch (error) {
    errorLog(`index /api/accounts: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});


app.listen(env.PORT_NODEJS, async () => {
  infoLog(`dms-gui-backend ${env.DMSGUI_VERSION} Server ${process.version} running on port ${env.PORT_NODEJS}`);
  debugLog('🐞 debug mode is ENABLED');
  dbInit();

});
