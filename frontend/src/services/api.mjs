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
export const getServerStatus = async (containerName, test=undefined) => {
  if (!containerName) return {success: false, message: {}};

  const params = {};
  if (test !== undefined) params.test = test;
  try {
    const response = await api.get(`/status/${containerName}`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getServerEnvs = async (plugin, containerName, refresh, name) => {
  if (!containerName) return {success: false, message: []};

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

export const getSettings = async (plugin, schema, scope, containerName, name, encrypted=false) => {
  if (!containerName) return {success: false, message: []};

  const params = {encrypted:encrypted};
  if (name !== undefined) params.name = name;

  try {
    debugLog(api.get(`/settingss/${plugin}/${schema}/${scope}/${containerName} + ${params}`));
    const response = await api.get(`/settings/${plugin}/${schema}/${scope}/${containerName}`, {params});
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const getConfigs = async (plugin, schema, name) => {
  try {
    let         path = `/configs/${plugin}`;
    if (schema) path = `/configs/${plugin}/${schema}`;
    if (name)   path = `/configs/${plugin}/${schema}/${name}`;

    const response = await api.get(path);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const saveSettings = async (plugin, schema, scope, containerName, jsonArrayOfObjects, encrypted=false) => {
  if (!containerName) return {success: false, message: 'containerName is required'};
  const params = {encrypted:encrypted};
  
  try {
    debugLog(api.post(`/settings/${plugin}/${schema}/${scope}/${containerName} + ${params}`, jsonArrayOfObjects));
    const response = await api.post(`/settings/${plugin}/${schema}/${scope}/${containerName}`, jsonArrayOfObjects, {params});   // jsonArrayOfObjects = [{name:name, value:value}, ..]
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

export const addLogin = async (mailbox, username, password, email, isAdmin=0, isAccount=0, isActive=1, favorite, roles=[]) => {
  if (!mailbox) return {success: false, message: 'mailbox is required'};
  if (!username) return {success: false, message: 'username is required'};
  if (!password) return {success: false, message: 'password is required'};
  try {
    const response = await api.put(`/logins`, { mailbox, username, password, email, isAdmin, isActive, isAccount, favorite, roles });
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const updateLogin = async (mailbox, jsonDict) => {
  if (!mailbox) return {success: false, message: 'mailbox is required'};
  if (!jsonDict) return {success: false, message: 'jsonDict is required'};
  try {
    const response = await api.patch(`/logins/${mailbox}`, jsonDict); // jsonDict = {username:username, isAdmin:0, isActive:0, mailbox:newEmail} // mailbox must be last
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

export const deleteLogin = async mailbox => {
  if (!mailbox) return {success: false, message: 'mailbox is required'};
  try {
    const response = await api.delete(`/logins/${mailbox}`);
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
  if (!containerName) return {success: false, message: []};

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
    const response = await api.patch(`/accounts/${containerName}/${mailbox}`, jsonDict); // jsonDict = {password:password}
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};

// export const getAliases = async (refresh) => {
export const getAliases = async (containerName, refresh) => {
  if (!containerName) return {success: false, message: []};

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
  if (!containerName) return {success: false, message: []};

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
  if (!credential) return {success: false, message: []};

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


// kill will reboot this container
export const kill = async () => {
  
  try {
    const response = await api.post(`/kill`);
    return response.data;
  } catch (error) {
    errorLog(error.message);
    throw error;
  }
};


export default api;
