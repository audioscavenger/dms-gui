import axios from 'axios';

import {
  debugLog,
  errorLog
} from '../../frontend.mjs';

// Fallback to '/api' if environment variable is not available // fix: this will never happen as api runs in the client's browser
// const API_URL =
//   (typeof process !== 'undefined' &&
//     process.env.API_URL) ||
//   '/api';
const API_URL = '/api';

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


// Safely encode all urls
api.interceptors.request.use((config) => {
  if (config.url) {
    // 1. Split the URL path from any trailing query strings (?page=1)
    const [path, queryString] = config.url.split('?');
    
    // 2. Split path by slashes, encode individual segments, and rejoin them
    const encodedPath = path
      .split('/')
      .map(segment => {
        // Skip encoding if the segment is already encoded or empty
        if (!segment || segment.includes('%')) return segment;
        return encodeURIComponent(segment);
      })
      .join('/');
      
    // 3. Reconstruct the full URL
    config.url = queryString ? `${encodedPath}?${queryString}` : encodedPath;
  }
  return config;

}, (error) => {
  return Promise.reject(error);
});


// Response interceptor with automatic token refresh
api.interceptors.response.use(
  (response) => response,   // Any status code within the range of 2xx triggers this function

  async (error) => {
    // Any status codes outside the range of 2xx trigger this function
    // debugLog('interceptor error', error);
      // AxiosError: Request failed with status code 401  // login denied
      // AxiosError: Request aborted
      // AxiosError: Request failed with status code 520  // invalid password
      // AxiosError: Request failed with status code 500  // backend index catch error

    const originalRequest = error.config;                                               // Axios object
    const errorUrl = error.config?.url || 'Unknown URL';                                // /api call that failed
    const errorCode = error.code;                                                       // browser error: ERR_BAD_REQUEST
    const errorResponse = error.response;                                               // actual response sent back by backend server if any
    const errorResponseMessage = error.response?.data || 'No data provided';            // actual JSON object sent back by backend server
    const errorResponseCode = error.response?.data?.code || 'CODE_MISSING';             //  custom codes we can handle like TOKEN_EXPIRED
    const errorResponseError = error.response?.data?.error || 'No error provided';      //  custom error message added by all modules
    const httpStatus = error.response?.status || 'Network/Timeout Error';               // 502 401 403...
    const errorAxiosMessage = error.message || 'Unknown Axios error';                   // generic string generated locally by Axios or browser
    
    let isLogoutRequest = errorUrl.includes('/logout');

    debugLog('error: originalRequest', originalRequest);
    debugLog('error: errorUrl', errorUrl);
    debugLog('error: errorCode', errorCode);
    debugLog('error: errorResponse', errorResponse);
    debugLog('error: errorResponseMessage', errorResponseMessage);
    debugLog('error: errorResponseCode', errorResponseCode);
    debugLog('error: errorResponseError', errorResponseError);
    debugLog('error: httpStatus', httpStatus);
    debugLog('error: errorAxiosMessage', errorAxiosMessage);
    debugLog('error: isLogoutRequest', isLogoutRequest);

    // ---------------------- /logout
    // originalRequest'      transitional: {…}, adapter: (3) […], transformRequest: (1) […], transformResponse: (1) […], timeout: 0, xsrfCookieName: "XSRF-TOKEN", xsrfHeaderName: "X-XSRF-TOKEN", maxContentLength: -1, maxBodyLength: -1, env: {…}, … }
    // errorUrl              /logout
    // errorCode             ERR_BAD_REQUEST
    // errorResponse         { data: { error: "Invalid token", code: "INVALID_TOKEN" }, status: 403, statusText: "", headers: {…}, config: {…}, request: XMLHttpRequest }
    // errorResponseMessage  { error: "Invalid token", code: "INVALID_TOKEN" }
    // errorResponseCode     INVALID_TOKEN
    // errorResponseError    Invalid token
    // httpStatus            403
    // errorAxiosMessage     Request failed with status code 403
    // isLogoutRequest       true

    // ---------------------- /deleteLogin while module is missing from index
    // originalRequest'      transitional: {…}, adapter: (3) […], transformRequest: (1) […], transformResponse: (1) […], timeout: 0, xsrfCookieName: "XSRF-TOKEN", xsrfHeaderName: "X-XSRF-TOKEN", maxContentLength: -1, maxBodyLength: -1, env: {…}, … }
    // errorUrl              /logins/13
    // errorCode             ERR_BAD_RESPONSE
    // errorResponse         { data: { error: "deleteLogin is not defined" }, status: 500, statusText: "", headers: {…}, config: {…}, request: XMLHttpRequest }
    // errorResponseMessage  { error: "deleteLogin is not defined" }
    // errorResponseCode     CODE_MISSING
    // errorResponseError    deleteLogin is not defined
    // httpStatus            500
    // errorAxiosMessage     Request failed with status code 500
    // isLogoutRequest       false

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
    if (  errorCode == 'ERR_CANCELED'
       || errorCode == 'INTERNAL_ERROR'
       || errorResponseCode == 'CODE_MISSING'
       || errorAxiosMessage.includes('canceled', 'aborted')
       ) {
      debugLog(`1. errorCode=${errorCode} || errorResponseCode=${errorResponseCode} || errorAxiosMessage=${errorAxiosMessage}`);
      return Promise.reject({
        success: false,
        message: errorResponseError || errorAxiosMessage 
      });
    }
    
    // 2. If we are already heading to login, silence subsequent requests
    if (isRedirectingToLogin || isLogoutRequest) {
      debugLog(`2. isRedirectingToLogin=${isRedirectingToLogin} || isLogoutRequest=${isLogoutRequest}`);
      return new Promise(() => {}); // Return unresolved promise to halt execution silently
    }

    // 3. Handle complete server crashes (502, 503, 504) or network failures without backend response
    if (!errorResponse || httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
      if (!isLogoutRequest) { // prevent infinite redirect loop
        isRedirectingToLogin = true;
        window.location.replace('/login');
      }
      debugLog(`3. !errorResponse=${!errorResponse} httpStatus=${httpStatus} && isLogoutRequest=${isLogoutRequest}`);
      return new Promise(() => {}); // Return unresolved promise to halt execution silently
    }
    
    // 4. Handle standard Token Expiration (Attempt Token Refresh Loop)
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
        isLogoutRequest = true;
        window.location.href = '/login';
        // return Promise.reject(refreshError);
        debugLog(`4. errorResponseCode=${errorResponseCode} isLogoutRequest=${isLogoutRequest} /login`);
        return new Promise(() => {}); // Return unresolved promise to halt execution silently
      }
    }

    // Step 5: Handle Fatal Authentication Failures (Forced Logouts)
    const fatalAuthCodes = new Set([
      'NO_TOKEN', 
      'INVALID_TOKEN', 
      'NO_REFRESH_TOKEN', 
      'INVALID_REFRESH_TOKEN', 
      'REFRESH_TOKEN_EXPIRED', 
      ]);
    if (fatalAuthCodes.has(errorResponseCode)) {
      isRedirectingToLogin = true; // Locks the gate so simultaneous requests are muted

      // WIPE CLIENT STORAGE FLAGGING IMMEDIATELY
      localStorage.removeItem('user'); 
      sessionStorage.clear();
      
      window.location.replace('/login');
      debugLog(`5. errorResponseCode=${errorResponseCode} /login`);
      return new Promise(() => {}); // Return unresolved promise to halt execution silently
    }

    // Step 6: Handle Non-Fatal Known Application Error Codes
    switch (errorResponseCode) {
      case 'FORBIDDEN':
        console.error('Permission denied');
        break;
      
      case 'ACCOUNT_INACTIVE':
        alert('Your account is inactive. Please contact support.');
        break;
      
    }

    // 7. Normalized Safe Return Payload: extract response data if exist
      // 'ERR_BAD_REQUEST'  > usually INVALID_TOKEN
      // 'ERR_BAD_RESPONSE' > idex 500 with data, usually
    if (errorResponse && errorResponseMessage) {
      debugLog('graceful fail');
      return Promise.reject({
        success: false,
        message: errorResponseError || errorAxiosMessage 
      });
    }
    
    // 8. unknown error
    debugLog('ungraceful fail');
    return Promise.reject({
      success: false,
      message: errorAxiosMessage
    });
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
      errorLog(error.message || error);
    }
    throw error;
  }
};


// Server status API // not too fond of passing settings directly from the GUI
export const getServerStatus = async (plugin, containerName, test=undefined, settings=[]) => {
  if (!containerName) return {success: false, error: 'containerName is required'};
  // debugLog('ddebug api getServerStatus settings:', settings);

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

// credentials = mailbox | username | id | [mailbox | username | id, ..]
export const getLogins = async credentials => {
  debugLog(`api getLogins credentials`, credentials);
  const body = {credentials: credentials};
  
  return await cacheWrap(async () => {
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

export const deleteLogin = async (id, alsoDeleteMailbox=false) => {
  if (!id) return {success: false, error: 'id is required'};

  // api.delete cannot take a normal body
  return await cacheWrap(async () => {
    const response = await api.delete(`/logins/${id}`, { data: { alsoDeleteMailbox: alsoDeleteMailbox }});
    return response.data;
  });
};

export const loginUser = async (credential, password, test = false) => {
  if (!credential) return false;
  if (!password) return false;
  
  // Axios Interceptor does that for every calls now, but this stays here for posterity
  return await cacheWrap(async () => {
    // try is needed ty catch the Axios 401 from popping out in the console when /login tries the default user/pass
    try {
      const response = await api.post(`/loginUser`, { credential, password, test });
      return response.data;

    } catch (error) {
      // Return a clean structure so the frontend knows it failed without crashing
      return { success: false, error: error.response?.data || error.message };
    }
  });
};

export const logoutUser = async () => {
  
  return await cacheWrap(async () => {
    const response = await api.post(`/logout`);
    return response.data;

    // // Create an abort controller so we can cancel it cleanly if the page reloads
    // const controller = new AbortController();

    // try {
    //   const response = await api.post(`/logout`);
    //   return response.data;

    // } finally {
    //   // Ensure it gets aborted when we move away
    //   controller.abort();  // BUG: avorting controller after defining it will not help
    // }
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

export const deleteAccount = async (schema, containerName, mailbox, alsoDeleteLogin=false) => {
  if (!schema) return {success: false, error: 'schema is required'};
  if (!containerName) return {success: false, error: 'containerName is required'};
  if (!mailbox) return {success: false, error: 'mailbox is required'};

  // api.delete cannot take a normal body
  return await cacheWrap(async () => {
    // Encodes special characters like '@' and '.': done by the Axios interceptor but I leave encodeURIComponent here as a reminder
    const response = await api.delete(`/accounts/${schema}/${containerName}/${encodeURIComponent(mailbox)}`, { data: {alsoDeleteLogin:alsoDeleteLogin}});
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
  
  // api.delete cannot take a normal body
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

// TBD: probably works but atm we embedd roles from logins in the user object and it's secure since it's in the JWT payload
export const getRoles = async credential => {
  if (!credential) return {success: false, error: 'credential is required'};
  
  return await cacheWrap(async () => {
    const response = await api.get(`/roles/${credential}`);
    return response.data;
  });
};

// initAPI: generate a DMS_API_KEY or save it and inject API
export const initAPI = async (plugin, schema, containerName, action, dms_api_key_param) => {
  if (!action) return {success: false, error: 'action is required'};
  
  const params = {};
  if (action !== undefined) params.action = action;
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
