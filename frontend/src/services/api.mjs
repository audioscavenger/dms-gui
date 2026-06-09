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

// Helper function to create a pause
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
// Track if the app is already navigating away to prevent log bombing
let isRedirectingToLogin = false;

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
    const errorUrl = error.config?.url || 'Unknown URL';
    const errorCode = error.code;
    const errorResponseCode = error.response?.data?.code || 'No message provided';
    const httpStatus = error.response?.status || 'Network/Timeout Error';  // 502 401 403...
    const errorMessage = error.message || 'No message provided';
    const isLogoutRequest = errorUrl.includes('/logout');
    // debugLog(`ddebug WAIT5 api interceptor error Url: [${errorUrl}] | Status: ${httpStatus} | Code: ${errorResponseCode} | Message: ${errorMessage}`); await delay(5000);
    
      // Url: [/logout] | Status: Network/Timeout Error | Code: No message provided | Message: Request aborted <empty string>
      // Url: [/configs/mailserver] | Status: 403 | Code: INVALID_TOKEN | Message: Request failed with status code 403 <empty string> frontend.mjs:71:25
      // Url: [/infos] | Status: 403 | Code: INVALID_TOKEN | Message: Request failed with status code 403 <empty string>
      // Url: [/logout] | Status: 403 | Code: INVALID_TOKEN | Message: Request failed with status code 403 <empty string>

      // refresh loop after container reboot now stops after INVALID_TOKEN
      // Url: [/logout] | Status: 403 | Code: INVALID_TOKEN | Message: Request failed with status code 403 <empty string>
      // WAIT90 error INVALID_TOKEN: <empty string></empty>

      // refresh after container reboot:
      // Url: [/infos] | Status: 403 | Code: INVALID_TOKEN | Message: Request failed with status code 403 <empty string> frontend.mjs:71:25
      // Url: [/configs/mailserver] | Status: 403 | Code: INVALID_TOKEN | Message: Request failed with status code 403 <empty string>
      // Error fetching Node server info TypeError: "replace" is read-only

      // refresh after container reboot:
      // Url: [/infos] | Status: 401 | Code: NO_TOKEN | Message: Request failed with status code 401 <empty string>
      // also /logout doesn't work anymore

    // 1. If the browser intentionally canceled the request due to navigation, stop immediately
    if (errorCode === 'ERR_CANCELED' || error.message === 'canceled' || error.message?.includes('aborted')) {
      return new Promise(() => {}); // Halts processing silently without error logs
    }
    
    // 2. If we are already heading to login, silence subsequent requests
    if (isRedirectingToLogin) {
      return new Promise(() => {}); // Return unresolved promise to halt execution silently
    }

    // 3. Handle complete server crashes (502, 503, 504) or network failures
    if (!error.response || httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
      if (!isLogoutRequest) { // prevent infinite redirect loop
        isRedirectingToLogin = true;
        // window.location.href = '/login';
        window.location.replace('/login');
      }
      return Promise.reject(error);
    }
    
    // 4. Handle software errors: If access token expired, try to refresh
    if ((errorResponseCode === 'TOKEN_EXPIRED' || errorResponseCode === 'REFRESH_TOKEN_EXPIRED') && !originalRequest._retry) {
      if (isRefreshing) {
        // debugLog(`ddebug WAIT5 api interceptor start with ${errorResponseCode} isRefreshing`); await delay(5000); 

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
        // debugLog('ddebug WAIT6 api Call refresh endpoint'); await delay(6000); 
        // Call refresh endpoint
        await api.post('/refresh');
        
        isRefreshing = false;
        processQueue(null);
        
        // Retry the original request
        return api(originalRequest);

      } catch (refreshError) {
        // debugLog('ddebug WAIT7 api Refresh failed - redirect to login'); await delay(7000); 

        isRefreshing = false;
        processQueue(refreshError);

        // Refresh failed - redirect to login
        isRedirectingToLogin = true;
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    switch (errorResponseCode) {
      case 'NO_TOKEN':
      case 'INVALID_TOKEN':
      case 'NO_REFRESH_TOKEN':
      case 'INVALID_REFRESH_TOKEN':
      case 'REFRESH_TOKEN_EXPIRED':
      case 'ERR_BAD_REQUEST':
        if (!isLogoutRequest) { // prevent infinite redirect loop
          isRedirectingToLogin = true;
          // window.location.href = '/login';
          window.location.replace('/login');
        }
        break;
      
      case 'FORBIDDEN':
        console.error('Permission denied');
        break;
      
      case 'ACCOUNT_INACTIVE':
        alert('Your account is inactive. Please contact support.');
        break;
      
      default:
        // Don't bomb console errors if the logout call safely fails during unauth states
        if (!isRedirectingToLogin && !isLogoutRequest) {
          // console.error('API Error:', errorResponseCode, error.response?.data?.error || 'Unknown error');
          console.error('API Error:', errorResponseCode, error.response?.data?.error || error);   // AxiosError: Request failed with status code 502
        }
    }

    // debugLog(`ddebug WAIT33 error ${errorResponseCode}:`); console.debug(error); await delay(33000); // AxiosError: Request failed with status code 502
    return Promise.reject(error);
  }
);


// Wrapper to automatically handle logs and filter out server reboot errors
const cacheWrap = async (apiCallFunc) => {
  try {
    return await apiCallFunc();
  } catch (error) {
    const httpStatus = error.response?.status;
    
    // Only log if it's a real client/server bug, NOT a container reboot
    if (httpStatus !== 502 && httpStatus !== 503 && httpStatus !== 504 && error.code !== 'ERR_NETWORK') {
      errorLog(error.message);
    }
    throw error;
  }
};


// Server status API
export const getServerStatus = async (plugin, containerName, test=undefined, settings=[]) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  debugLog('api getServerStatus settings:', settings);

  const params = {};
  if (test !== undefined) params.test = test;
  
  return await cacheWrap(async () => {
    const response = await api.post(`/status/${plugin}/${containerName}`, {settings:settings}, {params});
    return response.data;
  });
};

// export const getServerEnvs = async (plugin, schema, containerName, refresh, name) => {
export const getServerEnvs = async (plugin, containerName, refresh=false, name) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  if (name !== undefined) params.name = name;
  
  return await cacheWrap(async () => {
    const response = await api.get(`/envs/${plugin}/${containerName}`, {params});
    return response.data;
  });
};

// Node infos API
export const getNodeInfos = async () => {
  
  return await cacheWrap(async () => {
    const response = await api.get(`/infos`);
    return response.data;
  });
};

export const getSettings = async (plugin, containerName, name, encrypted=false, scope) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  const params = {encrypted:encrypted};
  if (name !== undefined) params.name = name;
  
  return await cacheWrap(async () => {
    let         path = `/settings/${plugin}/${containerName}`;
    if (scope)  path = `/settings/${plugin}/${containerName}/${scope}`;

    const response = await api.get(path, {params});
    return response.data;
  });
};

export const getConfigs = async (plugin, name) => {
  
  return await cacheWrap(async () => {
    let         path = `/configs/${plugin}`;
    if (name)   path = `/configs/${plugin}/${name}`;

    debugLog(`api getConfigs plugin=${plugin} path=${path} name=${name}`);
    const response = await api.get(path);
    debugLog(`api getConfigs plugin=${plugin} path=${path} response:`, response);
    
    return response.data;
  });
};

export const saveSettings = async (plugin, schema, scope, containerName, jsonArrayOfObjects, encrypted=false) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  const params = {encrypted:encrypted};
  debugLog(`api saveSettings containerName=${containerName} jsonArrayOfObjects:`, jsonArrayOfObjects);
  
  return await cacheWrap(async () => {
    debugLog(`api.post(/settings/${plugin}/${schema}/${scope}/${containerName}`, jsonArrayOfObjects, 'params:', {params});
    const response = await api.post(`/settings/${plugin}/${schema}/${scope}/${containerName}`, jsonArrayOfObjects, {params});   // jsonArrayOfObjects = [{name:name, value:value}, ..]
    debugLog(`api.post(/settings/${plugin}/${schema}/${scope}/${containerName} response.data:`, response.data);
    return response.data;
  });
};

export const getLogins = async ids => {
  debugLog(`api getLogins ids`, ids);
  const body = {ids: ids};
  
  return await cacheWrap(async () => {
    debugLog(`api getLogins api.post(/getLogins`, body);
    const response = await api.post(`/getLogins`, body);
    return response.data;
  });
};

export const addLogin = async (mailbox, username, password, email, isAdmin=0, isAccount=0, isActive=1, mailserver, roles=[]) => {
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  if (!username) return {success: false, error: 'username is required'};
  if (!password) return {success: false, error: 'password is required'};
  
  return await cacheWrap(async () => {
    const response = await api.put(`/logins`, { mailbox, username, password, email, isAdmin, isActive, isAccount, mailserver, roles });
    return response.data;
  });
};

export const updateLogin = async (id, jsonDict) => {
  if (!id) return {success: false, error: 'id is required'};
  if (!jsonDict) return {success: false, error: 'jsonDict is required'};
  
  return await cacheWrap(async () => {
    const response = await api.patch(`/logins/${id}`, jsonDict); // jsonDict = {username:username, isAdmin:0, isActive:0, mailbox:newEmail} // mailbox had to be last, now ewe rely on id
    return response.data;
  });
};

export const deleteLogin = async id => {
  if (!id) return {success: false, error: 'id is required'};
  
  return await cacheWrap(async () => {
    const response = await api.delete(`/logins/${id}`);
    return response.data;
  });
};

export const loginUser = async (credential, password, test=false) => {
  if (!credential) return false;
  if (!password) return false;
  
  return await cacheWrap(async () => {
    const response = await api.post(`/loginUser`, { credential, password, test });
    return response.data;
  });
};

export const logoutUser = async () => {
  
  return await cacheWrap(async () => {
    // Create an abort controller so we can cancel it cleanly if the page reloads
    const controller = new AbortController();

    try {
      const response = await api.post(`/logout`);
      return response.data;

    } finally {
      // Ensure it gets aborted when we move away
      controller.abort();
    }
  });
};

export const getAccounts = async (containerName=null, refresh=false) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  
  return await cacheWrap(async () => {
    const response = await api.get(`/accounts/${containerName}`, {params});
    return response.data;
  });
};

export const addAccount = async (schema, containerName, mailbox, password, createLogin) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  if (!password) return {success: false, error: 'password is required'};
  
  return await cacheWrap(async () => {
    const response = await api.post(`/accounts/${schema}/${containerName}`, { mailbox, password, createLogin });
    return response.data;
  });
};

export const deleteAccount = async (schema, containerName, mailbox) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  
  return await cacheWrap(async () => {
    const response = await api.delete(`/accounts/${schema}/${containerName}/${mailbox}`);
    return response.data;
  });
};

export const doveadm = async (schema, containerName, command, mailbox, jsonDict={}) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  if (!command) return {success: false, error: 'command is required'};
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  
  return await cacheWrap(async () => {
    const response = await api.put(`/doveadm/${schema}/${containerName}/${command}/${mailbox}`, jsonDict); // jsonDict = {field:"messages unseen vsize", box:"INBOX Junk"}
    return response.data;
  });
};

export const updateAccount = async (schema, containerName, mailbox, jsonDict) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  if (!mailbox) return {success: false, error: 'mailbox is required'};
  
  return await cacheWrap(async () => {
    const response = await api.patch(`/accounts/${schema}/${containerName}/${mailbox}`, jsonDict); // jsonDict = {password:password}
    return response.data;
  });
};

export const getAliases = async (containerName=null, refresh=false) => {
  if (!containerName) return {success: false, error: 'containerName is required'};

  const params = {};
  if (refresh !== undefined) params.refresh = refresh;
  
  return await cacheWrap(async () => {
    const response = await api.get(`/aliases/${containerName}`, {params});
    return response.data;
  });
};

export const addAlias = async (containerName=null, source, destination) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  
  return await cacheWrap(async () => {
    const response = await api.post(`/aliases/${containerName}`, { source, destination });
    return response.data;
  });
};

export const deleteAlias = async (containerName=null, source, destination) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  
  return await cacheWrap(async () => {
    // Although the HTTP specification for DELETE requests does not explicitly define semantics for a request body, Axios allows you to include one by using the data property within the optional config object.
    const response = await api.delete(`/aliases/${containerName}`, { data: { source:source, destination:destination }});   // regex aliases cannot be url params
    return response.data;
  });
};

export const getDomains = async (containerName=null, name) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  
  return await cacheWrap(async () => {
    const response = await api.get(`/getDomains/${containerName}/${name}`);
    return response.data;
  });
};

export const getCount = async (table, containerName) => {
  if (!table) return {success: false, error: 'table is required'};
  
  return await cacheWrap(async () => {
    const response = await api.get(`/getCount/${table}/${containerName}`);
    return response.data;
  });
};

// TBD
export const getRoles = async credential => {
  if (!credential) return {success: false, error: 'credential is required'};
  
  return await cacheWrap(async () => {
    const response = await api.get(`/roles/${credential}`);
    return response.data;
  });
};

// initAPI to define or generate a new DMS_API_KEY
export const initAPI = async (plugin, schema, containerName, dms_api_key_param) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  
  const params = {};
  if (dms_api_key_param !== undefined) params.dms_api_key_param = dms_api_key_param;
  
  return await cacheWrap(async () => {
    const response = await api.post(`/initAPI/${plugin}/${schema}/${containerName}`, params);
    return response.data;
  });
};


// kill will reboot this container
export const killContainer = async (plugin, schema, containerName) => {
  let                 path = `/configs`;
  if (plugin)         path = `/configs/${plugin}`;
  if (schema)         path = `/configs/${plugin}/${schema}`;
  if (containerName)  path = `/configs/${plugin}/${schema}/${containerName}`;
  
  return await cacheWrap(async () => {
    const response = await api.post(`/killContainer`);
    return response.data;
  });
};


export default api;
