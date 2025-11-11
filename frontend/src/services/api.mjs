import axios from 'axios';

import {
  debugLog,
  errorLog
} from '../../frontend.mjs';


// Fallback to '/api' if environment variable is not available
const API_URL =
  (typeof process !== 'undefined' &&
    process.env.API_URL) ||
  '/api';

    // 'Authorization': 'Bearer YOUR_AUTH_TOKEN',
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Security with HTTP-Only Cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Security with Bearer token
// api.interceptors.request.use((config) => {
  // const token = localStorage.getItem('accessToken'); // Or retrieve from state
  // if (token) {
    // config.headers.Authorization = `Bearer ${token}`;
  // }
  // return config;
// });


// Server status API
// export const getServerStatus = async () => {
export const getServerStatus = async containerName => {
  if (!containerName) return {};
  try {
    const response = await api.get(`/status/${containerName}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getServerEnvs = async (containerName, refresh, name) => {
  if (!containerName) return [];
  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  if (name !== undefined) params.name = name;
  try {
    const response = await api.get(`/envs/${containerName}`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// Node infos API
export const getNodeInfos = async () => {
  try {
    const response = await api.get(`/infos`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getSettings = async (containerName, name) => {
  if (!containerName) return [];
  const params = {};
  if (name !== undefined) params.name = name;
  try {
    debugLog(api.get(`/settings/${containerName}`, params));
    const response = await api.get(`/settings/${containerName}`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getScopes = async () => {
  try {
    const response = await api.get(`/scopes`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const saveSettings = async (containerName, jsonArrayOfObjects) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  
  try {
    debugLog(api.post(`/settings/${containerName}`, jsonArrayOfObjects));
    const response = await api.post(`/settings/${containerName}`, jsonArrayOfObjects);   // jsonArrayOfObjects = [{name:name, value:value}, ..]
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getLogins = async credentials => {
  debugLog(`getLogins credentials`, credentials);
  const body = {credentials: credentials};
  try {
    debugLog(`getLogins api.post(/logins/`, body);
    const response = await api.post(`/logins`, body);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const addLogin = async (email, username, password, isAdmin=0, isAccount=0, isActive=1, roles=[]) => {
  if (!email) return {success: false, message: 'email is required'};
  if (!username) return {success: false, message: 'username is required'};
  try {
    const response = await api.put(`/logins`, { email, username, password, isAdmin, isActive, isAccount, roles });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const updateLogin = async (email, jsonDict) => {
  if (!email) return {success: false, message: 'email is required'};
  try {
    const response = await api.patch(`/logins/${email}/update`, jsonDict); // jsonDict = {username:username, isAdmin:0, isActive:0, email:newEmail} // email must be last
    debugLog('ddebug updateLogin patch', response)
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const deleteLogin = async email => {
  if (!email) return {success: false, message: 'email is required'};
  try {
    const response = await api.delete(`/logins/${email}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const loginUser = async (credential, password) => {
  debugLog(`ddebug frontend received credential=${credential}, password=${password}`)
  if (!credential) return false;
  if (!password) return false;
  try {
    const response = await api.post(`/loginUser`, { credential, password });
    debugLog('ddebug loginUser response', response)
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const response = await api.post(`/logout`);
    debugLog('ddebug logoutUser response', response)
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getAccounts = async (containerName, refresh) => {
  if (!containerName) return [];
  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  try {
    const response = await api.get(`/accounts/${containerName}`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const addAccount = async (containerName, mailbox, password, createLogin) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  if (!mailbox) return {success: false, message: 'mailbox is required'};
  if (!password) return {success: false, message: 'password is required'};
  try {
    const response = await api.post(`/accounts/${containerName}`, { mailbox, password, createLogin });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const deleteAccount = async (mailbox) => {
export const deleteAccount = async (containerName, mailbox) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  try {
    const response = await api.delete(`/accounts/${containerName}/${mailbox}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const doveadm = async (containerName, command, mailbox, jsonDict={}) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  if (!command) return {success: false, message: 'command is required'};
  if (!mailbox) return {success: false, message: 'mailbox is required'};
  try {
    const response = await api.put(`/doveadm/${containerName}/${command}/${mailbox}`, jsonDict); // jsonDict = {field:"messages unseen vsize", box:"INBOX Junk"}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const updateAccount = async (containerName, mailbox, jsonDict) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  if (!mailbox) return {success: false, message: 'mailbox is required'};
  try {
    const response = await api.patch(`/accounts/${containerName}/${mailbox}/update`, jsonDict); // jsonDict = {password:password}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const getAliases = async (refresh) => {
export const getAliases = async (containerName, refresh) => {
  if (!containerName) return [];
  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  try {
    const response = await api.get(`/aliases/${containerName}`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const addAlias = async (source, destination) => {
export const addAlias = async (containerName, source, destination) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  try {
    const response = await api.post(`/aliases/${containerName}`, { source, destination });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const deleteAlias = async (source, destination) => {
export const deleteAlias = async (containerName, source, destination) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  try {
    // Although the HTTP specification for DELETE requests does not explicitly define semantics for a request body, Axios allows you to include one by using the data property within the optional config object.
    // const response = await api.delete(`/aliases/${source}/${destination}`);
    const response = await api.delete(`/aliases/${containerName}`, { data: { source:source, destination:destination }});   // regex aliases cannot be url params
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getDomains = async (containerName, name) => {
  if (!containerName) return [];
  try {
    const response = await api.get(`/getDomains/${containerName}/${name}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getCount = async (table, containerName) => {
  if (!table) return {success: false, count:0};

  try {
    const response = await api.get(`/getCount/${table}/${containerName}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// TBD
export const getRoles = async credential => {
  if (!credential) return [];
  try {
    const response = await api.get(`/roles/${credential}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// initAPI to define or generate a new DMS_API_KEY
export const initAPI = async (containerName, dms_api_key_param) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  
  const params = {};
  if (dms_api_key_param !== undefined) params.dms_api_key_param = dms_api_key_param;
  
  try {
    const response = await api.post(`/initAPI/${containerName}`, params);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};


export default api;
