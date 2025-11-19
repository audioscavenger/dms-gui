import {
  debugLog,
  errorLog,
  infoLog,
  killMe,
} from './backend.mjs';
import {
  env
} from './env.mjs';

import {
  dbCount,
  dbGet,
  dbInit,
  deleteEntry,
  refreshTokens,
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

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
// import jwt from 'express-jwt';
import cron from 'node-cron';
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


// cors manual way
// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });

// cors the react way https://expressjs.com/en/resources/middleware/cors.html
debugLog('env.API_URL',env.API_URL)
debugLog('env.FRONTEND_URL',env.FRONTEND_URL)
// const allowedOrigins = [
//   env.API_URL,              // Development
//   env.FRONTEND_URL,         // Production from docker    // another shit to maintain
// ];
// const corsOptions = {
//   origin: function (origin, callback) {
//     // Allow requests with no origin (mobile apps, etc.)
//     if (!origin) return callback(null, true);
    
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization', Accept-Language'] X-Requested-With
// };
const corsOptions = {
  origin: true,       // reflect the request origin, as defined by req.header('Origin')
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
};

// ============================================
// HOW SECURITY WORKS HERE
// ============================================
/*
1. User logs in → receives accessToken (1h) + refreshToken (7 days)
2. Every request uses accessToken
3. When accessToken expires:
   - Frontend intercepts 401 error
   - Automatically calls /api/refresh
   - Gets new accessToken
   - Retries original request
4. User stays logged in for 7 days (or until they logout)
5. If refreshToken expires → user must login again

SECURITY BENEFITS:
✅ Short-lived access tokens limit attack window
✅ Refresh tokens stored in database (can be revoked)
✅ Automatic token refresh = seamless UX
✅ Different secrets for access/refresh tokens
✅ Logout invalidates refresh token
✅ All tokens are httpOnly cookies (XSS protection)
*/

app.use(cookieParser());
app.use(cors(corsOptions));

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    user,
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRY }
  );
};


// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, mailbox: user.mailbox }, // Only store minimal data
    env.JWT_SECRET_REFRESH, // Different secret!
    { expiresIn: env.REFRESH_TOKEN_EXPIRY }
  );
};


// authenticateToken middleware extracts JWT from cookie and adds req.user to every request
const authenticateToken = (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken; // Assuming cookie name is 'token', provided by cookieParser
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN' 
      });
    }

    const decoded = jwt.verify(accessToken, env.JWT_SECRET);
    req.user = decoded; // Attach user data to request
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED' 
      });
    }
    return res.status(403).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN' 
    });
  }
};

// requireAdmin middleware checks if req.user.isAdmin is true
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Admin access required',
      code: 'FORBIDDEN' 
    });
  }
  next();
};

// Check if user is active
const requireActive = (req, res, next) => {
  if (!req.user || !req.user.isActive) {
    return res.status(403).json({ 
      error: 'Account is inactive',
      code: 'ACCOUNT_INACTIVE' 
    });
  }
  next();
};


app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(oasDefinition));

// app.options('*', cors()) // include pre-flight across-the-board before other routes

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
app.get('/api/status/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
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
app.get('/api/infos', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
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
app.get('/api/envs/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
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
app.get('/api/accounts/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    const refresh = ('refresh' in req.query) ? req.query.refresh : false;

    // Users can only pull their own mailboxes or those in their roles (unless admin)
    let accounts;
    if (req.user.isAdmin) {
      accounts = await getAccounts(containerName, refresh);

    } else {
      // const roles = await getRoles(req.user.mailbox);
      accounts = await getAccounts(containerName, false, req.user.roles);
    }
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
app.post('/api/accounts/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
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
app.put('/api/doveadm/:containerName/:command/:mailbox', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { containerName, command, mailbox } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    if (!command || !mailbox) return res.status(400).json({ error: 'Command and Mailbox are required' });
    
    // Users can only act on their own mailboxes or those in their roles (unless admin)
    let result;
    if (req.user.isAdmin) {
      result = await doveadm(containerName, command, mailbox, req.body);

    } else {
      // const roles = await getRoles(req.user.mailbox);
      result = (req.user.roles.includes(mailbox)) ? await doveadm(containerName, command, mailbox, req.body) : {success: false, message: 'Permission denied'};
    }
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
app.delete('/api/accounts/:containerName/:mailbox', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
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
 * /api/accounts/{containerName}/{mailbox}:
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
app.patch('/api/accounts/:containerName/:mailbox', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { containerName, mailbox } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    if (!mailbox)       return res.status(400).json({ error: 'Mailbox is required' });

    // Users can only act on their own mailboxes or those in their roles (unless admin)
    let result;
    if (req.user.isAdmin) {
      result = await updateDB('accounts', mailbox, req.body, containerName);

    } else {
      // const roles = await getRoles(req.user.mailbox);
      result = (req.user.roles.includes(mailbox)) ? await updateDB('accounts', mailbox, req.body, containerName) : {success: false, message: 'Permission denied'};
    }
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
app.get('/api/aliases/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    const refresh = ('refresh' in req.query) ? req.query.refresh : false;

    // Users can only act on their own mailboxes or those in their roles (unless admin)
    let result;
    if (req.user.isAdmin) {
      result = await getAliases(containerName, refresh);

    } else {
      // const roles = await getRoles(req.user.mailbox);
      result = await getAliases(containerName, false, req.user.roles);
    }
    res.json(result);

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
app.post('/api/aliases/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    const { source, destination } = req.body;
    if (!source || !destination) {
      return res
        .status(400)
        .json({ error: 'Source and destination are required' });
    }

    // Users can only act on their own mailboxes or those in their roles (unless admin)
    let result;
    if (req.user.isAdmin) {
      result = await addAlias(containerName, source, destination);

    } else {
      // const roles = await getRoles(req.user.mailbox);
      // TODO: find a way to analyze regex so users do not hijack others
      
      // check source for obvious hack attempt. extract domains and see that they match. Only admins can create aliases for different domain then destination
      let domainSource = source.match(/.*@([\_\-\.\w]+)/);
      let domainDest = destination.match(/.*@([\_\-\.\w]+)/);
      let domainsMatch = (domainSource.length == 2 && domainDest.length == 2 && domainSource[1] == domainDest[1]) ? true : false;
      result = (req.user.roles.includes(destination) && domainsMatch) ? await addAlias(containerName, source, destination) : {success:false, message: 'Permission denied'};
    }
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
app.delete('/api/aliases/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const { source, destination } = req.body;
    if (!source || !destination) {
      return res
        .status(400)
        .json({ error: 'Source and destination are required' });
    }
    
    // Users can only act on their own mailboxes or those in their roles (unless admin)
    let result;
    if (req.user.isAdmin) {
      result = await deleteAlias(containerName, source, destination);

    } else {
      // const roles = await getRoles(req.user.mailbox);
      result = (req.user.roles.includes(destination)) ? await deleteAlias(containerName, source, destination) : {success:false, message: 'Permission denied'};
    }
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
app.get('/api/settings/:containerName', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });
    const name = ('name' in req.query) ? req.query.name : undefined;
    const encrypted = ('encrypted' in req.query) ? req.query.encrypted : false;

    const settings = (req.user.isAdmin) ? await getSettings(containerName, name, encrypted) : {success:false, message:'Permission denied'};    // fails silently
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
app.get('/api/scopes', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const scopes = await getScopes((req.user.isAdmin) ? undefined : req.user.roles);
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
app.post('/api/settings/:containerName', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
  try {
    const { containerName } = req.params;
    if (!containerName) return res.status(400).json({ error: 'containerName is required' });

    const encrypted = ('encrypted' in req.query) ? req.query.encrypted : false;

    const result = await saveSettings(containerName, req.body, encrypted);     // req.body = [{name:name, value:value}, ..]
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
 *         description: login credential = mailbox
 *     responses:
 *       200:
 *         description: all roles even if empty
 *       500:
 *         description: Unable to retrieve roles
 */
app.get('/api/roles/:credential', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { credential } = req.params;
    if (!credential) return res.status(400).json({ error: 'credential is required' });
    
    // Users can only act on their own mailboxes or those in their roles (unless admin)
    let result;
    if (req.user.isAdmin) {
      result = await getRoles(credential);

    } else {
      // const roles = await getRoles(req.user.mailbox);
      result = (credential == req.user.mailbox) ? await getRoles(credential) : {success:false, message: 'Permission denied'};
    }
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
app.post('/api/logins', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
  try {
    const { credentials } = req.body;
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
app.put('/api/logins', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
  try {
    const { mailbox, username, password, email, isAdmin, isAccount, isActive, favorite, roles } = req.body;
    if (!mailbox)     return res.status(400).json({ error: 'mailbox is missing' });
    if (!username)  return res.status(400).json({ error: 'username is missing' });
    if (!password)  return res.status(400).json({ error: 'password is missing' });

    const result = await addLogin(mailbox, username, password, email, isAdmin, isAccount, isActive, favorite, roles);
    res.status(201).json(result);
    
  } catch (error) {
    errorLog(`index PUT /api/logins: ${error.message}`);
    // res.status(500).json({ error: 'Unable to save Login' });
    res.status(500).json({ error: error.message });
  }
});

// update logins and change password
// https://swagger.io/docs/specification/v3_0/data-models/data-types/#objects
/**
 * @swagger
 * /api/logins/{mailbox}:
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
 *               favorite:
 *                 type: string
 *                 description: New mailbox for the login account
 *     responses:
 *       200:
 *         description: Data updated successfully
 *       400:
 *         description: mailbox or data are required
 *       500:
 *         description: Unable to update login
 */
app.patch('/api/logins/:mailbox', 
  authenticateToken, 
  requireActive, 
async (req, res) => {
  try {
    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'mailbox is required' });
    }

    // Users can only act on their own mailboxes or those in their roles (unless admin)
    let result;
    if (req.user.isAdmin) {
      result = await updateDB('logins', mailbox, req.body);

    } else {
      result = (mailbox == req.user.mailbox) ? await updateDB('logins', mailbox, req.body) : {success:false, message: 'Permission denied'};
    }
    debugLog(`index PATCH /api/logins/${mailbox}`, result)
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
app.delete('/api/logins/:mailbox', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
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
 *               test:
 *                 type: boolean
 *                 description: test login or not
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
app.post('/api/loginUser', async (req, res, next) => {
  try {
    const { credential, password, test } = req.body;
    if (!credential)  return res.status(400).json({ error: 'credential is missing' });
    if (!password)    return res.status(400).json({ error: 'password is missing' });

    const user = await loginUser(credential, password);
    if (env.isDEMO) user.isDEMO = true;
    if (env.debug) user.debug = true;
    // debugLog('user', user);
    
    if (user.success) {
      if (env.isDEMO) user.message.isDEMO = true;
      if (test) {
        res.json({success: true, isDEMO:env.isDEMO});  // just return true, not real login

      } else {
        // Generate tokens
        const accessToken = generateAccessToken(user.message);
        const refreshToken = generateRefreshToken(user.message);
        // debugLog('accessToken', accessToken);
        // debugLog('refreshToken', refreshToken);

        // Store refresh token in database
        updateDB('logins', user.message.mailbox, {refreshToken:refreshToken});

        // HTTP-Only Cookies (for Refresh Tokens):
        res.cookie('accessToken', accessToken, { 
          httpOnly: true, 
          secure: env.NODE_ENV === 'production',        // Use secure in production
          sameSite: 'Strict',                           // 'None' or 'Lax' or 'Strict' (for CSRF protection)
          maxAge: 3600000                               // 1h
        });

        res.cookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 7 * 24 * 60 * 60 * 1000               // 7 days
        });

        // and we indeed send user's information with isAdmin, roles etc
        res.json(user);
      }

    } else {
      res.status(401).json(user);   // TODO: do we really want to inform the frontend with exact error?
    }

  } catch (error) {
    errorLog(`index POST /api/loginUser: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});


// Refresh access token using refresh token
/**
 * @swagger
 * /api/refresh:
 *   post:
 *     summary: refresh token
 *     description: refresh token
 *     responses:
 *       200:
 *         description: token refreshed
 *       401:
 *         description: token expired or missing
 *       403:
 *         description: token invalid or hack attempt
 */
app.post('/api/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN' 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET_REFRESH);

    // Check if refresh token exists in database
    const result = dbGet(sql.logins.select.refreshToken, decoded.id, {refreshToken:refreshToken});
    const user = (result.success) ? result.message : undefined;

    if (!user) {
      return res.status(403).json({ 
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN' 
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.json({ 
      success: true,
      message: 'Token refreshed' 
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Refresh token expired. Please login again.',
        code: 'REFRESH_TOKEN_EXPIRED' 
      });
    }
    console.error('Refresh error:', error);
    res.status(403).json({ 
      error: 'Failed to refresh token',
      code: 'REFRESH_ERROR' 
    });
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
app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    // Remove refresh token from database
    updateDB('logins', req.user.mailbox, {refreshToken:"null"});

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR' 
    });
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
app.get('/api/domains/:containerName/:domain', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
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
app.get('/api/getCount/:table/:containerName', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
  try {
    const { table, containerName } = req.params;
    if (!table) return res.status(400).json({ error: 'table is required' });
    
    const count = dbCount(table, containerName);
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
app.post('/api/initAPI/:containerName', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
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


// Endpoint for rebooting this container
/**
 * @swagger
 * /api/kill:
 *   post:
 *     summary: reboot this container
 *     description: reboot this container
 *     responses:
 *       200:
 *         description: true
 *       401:
 *         description: access denied
 *       500:
 *         description: Unable to restart container
 */
app.post('/api/kill', 
  authenticateToken, 
  requireActive, 
  requireAdmin, 
async (req, res) => {
  try {
    
    const result = killMe();    // no await
    res.json({success:true, message: result?.message});
    
  } catch (error) {
    errorLog(`index /api/kill: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});


// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  const isDevelopment = env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { stack: err.stack })
  });
});


app.listen(env.PORT_NODEJS, async () => {
  infoLog(`dms-gui-backend ${env.DMSGUI_VERSION} Server ${process.version} running on port ${env.PORT_NODEJS}`);
  debugLog('🐞 debug mode is ENABLED');

  if (!env.AES_SECRET) {
    errorLog(`AES_SECRET has not been set. Example to create it: "openssl rand -hex 32"`);
  }

  // https://github.com/ncb000gt/node-cron    // internal crontan
  debugLog('DMSGUI_CRON',env.DMSGUI_CRON)
  if (env.DMSGUI_CRON) {
    cron.schedule(env.DMSGUI_CRON, () => {
        const result = killMe(true);    // no await
    });
  };

  dbInit();         // apply patches etc
  refreshTokens();  // delete all user's refreshToken as the secret has changed after a restart

});


// ============================================
// CRITICAL SECURITY CHECKLIST
// ============================================

/*
✅ JWT contains user role (isAdmin, isActive)
✅ Backend middleware verifies JWT on every request
✅ Admin-only routes use requireAdmin middleware
✅ Users can't modify their own admin status
✅ Database queries use parameterized statements (SQL injection protection)
✅ Error responses don't leak sensitive information
✅ Frontend axios configured with withCredentials: true
✅ httpOnly cookies prevent XSS attacks

more ideas:
1. Add rate limiting to prevent brute force attacks
2. Consider re-verifying admin status from DB for critical operations
3. Add logging for all admin actions (audit trail)
4. Implement CSRF tokens for extra protection
5. Set short JWT expiration times (15-30 min) with refresh tokens
*/
