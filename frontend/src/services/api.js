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
export async function getServerStatus(containerName) {
  const params = {};
  if (containerName !== undefined) params.containerName = containerName;
  try {
    const response = await api.get(`/status`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// Server infos API
export async function getServerInfos() {
  try {
    const response = await api.get(`/infos`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getServerEnvs(refresh, containerName, name) {
  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  if (containerName !== undefined) params.containerName = containerName;
  if (name !== undefined) params.name = name;
  try {
    const response = await api.get(`/envs`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getSettings(containerName, name) {
  const params = {};
  if (containerName !== undefined) params.containerName = containerName;
  if (name !== undefined) params.name = name;
  try {
    const response = await api.get(`/settings`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function saveSettings(containerName, jsonArrayOfObjects) {
  try {
    const response = await api.post(`/settings/${containerName}`, jsonArrayOfObjects);   // jsonArrayOfObjects = [{name:name, value:value}, ..]
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

export async function addLogin(email, username, password, isAdmin=0, isAccount=0, isActive=1, roles=[]) {
  try {
    const response = await api.post(`/logins`, { email, username, password, isAdmin, isActive, isAccount, roles });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function updateLogin(email, jsonDict) {
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
    const response = await api.post(`/loginUser`, { credential, password });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getAccounts(refresh) {
  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  try {
    const response = await api.get(`/accounts`, {params});
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
  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  try {
    const response = await api.get(`/aliases`, {params});
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
  const params = {};
  if (name !== undefined) params.name = name;
  try {
    const response = await api.post(`/getDomains`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export async function getCount(table) {
  try {
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

// initAPI to define or generate a new DMS_API_KEY
export async function initAPI(dms_api_key) {
  const params = {};
  if (dms_api_key !== undefined) params.dms_api_key = dms_api_key;
  try {
    const response = await api.post(`/initAPI`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};


export default api;
