import axios from 'axios';

import {
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
} from '../../frontend.js';


// Fallback to '/api' if environment variable is not available
const API_URL =
  (typeof process !== 'undefined' &&
    process.env.REACT_APP_API_URL) ||
  '/api';

    // 'Authorization': 'Bearer YOUR_AUTH_TOKEN',
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Server status API
// export const getServerStatus = async () => {
export async function getServerStatus() {
  try {
    const response = await api.get(`/status`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// Server infos API
// export const getServerStatus = async () => {
export async function getServerInfos(refresh) {
  const query = (refresh === undefined) ? '' : `?refresh=${refresh}`;
  try {
    const response = await api.get(`/infos${query}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getServerEnv(name) {
  try {
    const response = await api.get(`/env?name=${name}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getServerEnvs(refresh) {
  const query = (refresh === undefined) ? '' : `?refresh=${refresh}`;
  try {
    const response = await api.get(`/envs${query}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const getSettings = async () => {
export async function getSettings(name='') {
  try {
    const response = await api.get(`/settings?name=${name}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const saveSettings = async (containerName, setupPath, dnsProvider) => {
// export async function saveSettings(containerName, setupPath, dnsProvider) {
export async function saveSettings(jsonArrayOfObjects) {
  try {
    const response = await api.post(`/settings`, jsonArrayOfObjects);   // jsonArrayOfObjects = [{name:name, value:value}, ..]
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getLogins() {
  try {
    const response = await api.get(`/logins`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function addLogin(email, username, password, isAdmin=0, isActive=1, isAccount=0, roles=[]) {
    // console.debug('ddebug api password, email',password, email)
  try {
    const response = await api.post(`/logins`, { email, username, password, isAdmin, isActive, isAccount, roles });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function updateLogin(email, jsonDict) {
  // console.debug('ddebug api jsonDict',jsonDict)
  try {
    const response = await api.put(`/logins/${email}/update`, jsonDict); // jsonDict = {username:username, isAdmin:0, isActive:0}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function deleteLogin(email) {
  try {
    const response = await api.delete(`/logins/${email}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function loginUser(credential, password) {
  try {
    // console.debug('ddebug api loginUser(credential, password)', credential, password)
    const response = await api.post(`/loginUser`, { credential, password });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const getAccounts = async (refresh) => {
export async function getAccounts(refresh) {
  const query = (refresh === undefined) ? '' : `?refresh=${refresh}`;
  try {
    const response = await api.get(`/accounts${query}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const addAccount = async (mailbox, password) => {
export async function addAccount(mailbox, password, createLogin) {
  try {
    const response = await api.post(`/accounts`, { mailbox, password, createLogin });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const deleteAccount = async (mailbox) => {
export async function deleteAccount(mailbox) {
  try {
    const response = await api.delete(`/accounts/${mailbox}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function doveadm(command, mailbox, jsonDict={}) {
  try {
    const response = await api.put(`/doveadm/${command}/${mailbox}`, jsonDict); // jsonDict = {field:"messages unseen vsize", box:"INBOX Junk"}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function updateAccount(mailbox, jsonDict) {
  try {
    const response = await api.put(`/accounts/${mailbox}/update`, jsonDict); // jsonDict = {password:password}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const getAliases = async (refresh) => {
export async function getAliases(refresh) {
  const query = (refresh === undefined) ? '' : `?refresh=${refresh}`;
  try {
    const response = await api.get(`/aliases${query}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const addAlias = async (source, destination) => {
export async function addAlias(source, destination) {
  try {
    const response = await api.post(`/aliases`, { source, destination });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const deleteAlias = async (source, destination) => {
export async function deleteAlias(source, destination) {
  try {
    // Although the HTTP specification for DELETE requests does not explicitly define semantics for a request body, Axios allows you to include one by using the data property within the optional config object.
    // const response = await api.delete(`/aliases/${source}/${destination}`);
    const response = await api.delete(`/aliases`, { data: { source:source, destination:destination }});   // regex aliases cannot be url params
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getDomains(name) {
  try {
    const response = await api.post(`/getDomains?name=${name}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getCount(table) {
  try {
    // const response = await api.post(`/getCount?table=${table}`);
    const response = await api.post(`/getCount/${table}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getRoles() {
  try {
    const response = await api.get(`/roles`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};


export default api;
