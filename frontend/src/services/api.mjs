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

// ============================================
// FRONTEND: Axios Setup with Bearer token
// ============================================
// Security with Bearer token
// api.interceptors.request.use((config) => {
  // const { origin } = new URL(config.url);
  // const token = localStorage.getItem('accessToken'); // Or retrieve from state
  // if (token) {
    // config.headers.Authorization = `Bearer ${token}`;
  // }
  // return config;
// });


// ============================================
// FRONTEND: Axios Setup with Auto-Refresh
// ============================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error.response?.data?.code;

    // If access token expired, try to refresh
    if (errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint
        await api.post('/refresh');
        
        isRefreshing = false;
        processQueue(null);
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        
        // Refresh failed - redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    switch (errorCode) {
      case 'NO_TOKEN':
      case 'INVALID_TOKEN':
      case 'NO_REFRESH_TOKEN':
      case 'INVALID_REFRESH_TOKEN':
      case 'REFRESH_TOKEN_EXPIRED':
      case 'ERR_BAD_REQUEST':
        window.location.href = '/login';
        break;
      
      case 'FORBIDDEN':
        console.error('Permission denied');
        break;
      
      case 'ACCOUNT_INACTIVE':
        alert('Your account is inactive. Please contact support.');
        break;
      
      default:
        console.error('API Error:', error.response?.data?.error || 'Unknown error');
    }

    return Promise.reject(error);
  }
);

// Server status API
// export const getServerStatus = async (plugin, schema, containerName, test=undefined, settings=[]) => {
export const getServerStatus = async (plugin, containerName, test=undefined, settings=[]) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  // debugLog('ddebug settings',settings);

  const params = {};
  if (test !== undefined) params.test = test;
  try {
    const response = await api.post(`/status/${plugin}/${containerName}`, {settings:settings}, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const getServerEnvs = async (plugin, schema, containerName, refresh, name) => {
export const getServerEnvs = async (plugin, containerName, refresh, name) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  if (name !== undefined) params.name = name;
  try {
    const response = await api.get(`/envs/${plugin}/${containerName}`, {params});
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

export const getSettings = async (plugin, containerName, name, encrypted=false, scope) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  const params = {encrypted:encrypted};
  if (name !== undefined) params.name = name;

  try {
    let         path = `/settings/${plugin}/${containerName}`;
    if (scope)  path = `/settings/${plugin}/${containerName}/${scope}`;

    const response = await api.get(path, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getConfigs = async (plugin, name) => {
  try {
    let         path = `/configs/${plugin}`;
    if (name)   path = `/configs/${plugin}/${name}`;

    debugLog(`ddebug api ${path}:`, response);
    const response = await api.get(path);
    debugLog(`getConfigs ${path} response:`, response);
    
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const saveSettings = async (plugin, schema, scope, containerName, jsonArrayOfObjects, encrypted=false) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  const params = {encrypted:encrypted};
  debugLog('ddebug containerName', containerName);
  debugLog('ddebug jsonArrayOfObjects', jsonArrayOfObjects);
  
  try {
    debugLog(`api.post(/settings/${plugin}/${schema}/${scope}/${containerName}`, jsonArrayOfObjects, {params});
    const response = await api.post(`/settings/${plugin}/${schema}/${scope}/${containerName}`, jsonArrayOfObjects, {params});   // jsonArrayOfObjects = [{name:name, value:value}, ..]
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getLogins = async ids => {
  debugLog(`getLogins ids`, ids);
  const body = {ids: ids};
  try {
    debugLog(`getLogins api.post(/getLogins`, body);
    const response = await api.post(`/getLogins`, body);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const addLogin = async (mailbox, username, password, email, isAdmin=0, isAccount=0, isActive=1, mailserver, roles=[]) => {
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  if (!username) return {success: false, error: 'username is required'};
  if (!password) return {success: false, error: 'password is required'};
  try {
    const response = await api.put(`/logins`, { mailbox, username, password, email, isAdmin, isActive, isAccount, mailserver, roles });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const updateLogin = async (id, jsonDict) => {
  if (!id) return {success: false, error: 'id is required'};
  if (!jsonDict) return {success: false, error: 'jsonDict is required'};
  try {
    const response = await api.patch(`/logins/${id}`, jsonDict); // jsonDict = {username:username, isAdmin:0, isActive:0, mailbox:newEmail} // mailbox had to be last, now ewe rely on id
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const deleteLogin = async id => {
  if (!id) return {success: false, error: 'id is required'};
  try {
    const response = await api.delete(`/logins/${id}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const loginUser = async (credential, password, test=false) => {
  if (!credential) return false;
  if (!password) return false;
  try {
    const response = await api.post(`/loginUser`, { credential, password, test });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const response = await api.post(`/logout`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getAccounts = async (containerName, refresh) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

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

export const addAccount = async (schema, containerName, mailbox, password, createLogin) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  if (!password) return {success: false, error: 'password is required'};
  try {
    const response = await api.post(`/accounts/${schema}/${containerName}`, { mailbox, password, createLogin });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const deleteAccount = async (schema, containerName, mailbox) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  try {
    const response = await api.delete(`/accounts/${schema}/${containerName}/${mailbox}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const doveadm = async (schema, containerName, command, mailbox, jsonDict={}) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  if (!command) return {success: false, error: 'command is required'};
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  try {
    const response = await api.put(`/doveadm/${schema}/${containerName}/${command}/${mailbox}`, jsonDict); // jsonDict = {field:"messages unseen vsize", box:"INBOX Junk"}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const updateAccount = async (schema, containerName, mailbox, jsonDict) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  try {
    const response = await api.patch(`/accounts/${schema}/${containerName}/${mailbox}`, jsonDict); // jsonDict = {password:password}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getAliases = async (containerName, refresh) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

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

export const addAlias = async (containerName, source, destination) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  try {
    const response = await api.post(`/aliases/${containerName}`, { source, destination });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const deleteAlias = async (containerName, source, destination) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  try {
    // Although the HTTP specification for DELETE requests does not explicitly define semantics for a request body, Axios allows you to include one by using the data property within the optional config object.
    const response = await api.delete(`/aliases/${containerName}`, { data: { source:source, destination:destination }});   // regex aliases cannot be url params
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getDomains = async (containerName, name) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  try {
    const response = await api.get(`/getDomains/${containerName}/${name}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getCount = async (table, containerName) => {
  if (!table) return {success: false, error: 'table is required'};

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
  if (!credential) return {success: false, error: 'credential is required'};

  try {
    const response = await api.get(`/roles/${credential}`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// initAPI to define or generate a new DMS_API_KEY
export const initAPI = async (plugin, schema, containerName, dms_api_key_param) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  
  const params = {};
  if (dms_api_key_param !== undefined) params.dms_api_key_param = dms_api_key_param;
  
  try {
    const response = await api.post(`/initAPI/${plugin}/${schema}/${containerName}`, params);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};


// kill will reboot this container
export const killContainer = async (plugin, schema, containerName) => {
  let                 path = `/configs`;
  if (plugin)         path = `/configs/${plugin}`;
  if (schema)         path = `/configs/${plugin}/${schema}`;
  if (containerName)  path = `/configs/${plugin}/${schema}/${containerName}`;
  
  try {
    const response = await api.post(`/killContainer`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};


export default api;
