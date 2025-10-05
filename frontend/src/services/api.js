const debug = true;
import axios from 'axios';

// Fallback to '/api' if environment variable is not available
const API_URL =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Server status API
export const getServerStatus = async () => {
  try {
    const response = await api.get('/status');
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error fetching server status:', error);
    throw error;
  }
};

export const getAccounts = async (refresh) => {
  refresh = (refresh === undefined) ? false : refresh;
  try {
    if (debug) console.debug(`ddebug frontend call to /accounts?refresh=${refresh} and refresh is typeof ${typeof refresh}`);
    const response = await api.get(`/accounts?refresh=${refresh.toString()}`);
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error fetching accounts:', error);
    throw error;
  }
};

export const getSettings = async () => {
  try {
    const response = await api.get(`/settings`);
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error getting settings:', error);
    throw error;
  }
};

export const saveSettings = async (containerName, setupPath) => {
  try {
    const response = await api.post('/settings', { containerName, setupPath });
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error saving settings:', error);
    throw error;
  }
};


export const getLogins = async () => {
  try {
    const response = await api.get(`/logins`);
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error getting logins:', error);
    throw error;
  }
};

export const saveLogins = async (username, email, password) => {
  try {
    const response = await api.post('/logins', { username, email, password });
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error saving logins:', error);
    throw error;
  }
};


export const addAccount = async (email, password) => {
  try {
    const response = await api.post('/accounts', { email, password });
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error adding account:', error);
    throw error;
  }
};

export const deleteAccount = async (email) => {
  try {
    const response = await api.delete(`/accounts/${email}`);
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error deleting account:', error);
    throw error;
  }
};

export const updateAccountPassword = async (email, password) => {
  try {
    const response = await api.put(`/accounts/${email}/password`, { password });
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error updating account password:', error);
    throw error;
  }
};

// export const getAliases = async (refresh) => {
export async function getAliases(refresh) {
  refresh = (refresh === undefined) ? false : refresh;
  try {
    if (debug) console.debug(`ddebug frontend call to /aliases?refresh=${refresh} and refresh is typeof ${typeof refresh}`);
    const response = await api.get(`/aliases?refresh=${refresh.toString()}`);
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error fetching aliases:', error);
    throw error;
  }
};

export const addAlias = async (source, destination) => {
  try {
    const response = await api.post('/aliases', { source, destination });
    return response.data;
  } catch (error) {
    if (debug) if (debug) console.error('api: Error adding alias:', error);
    throw error;
  }
};

export const deleteAlias = async (source, destination) => {
  try {
    const response = await api.delete(`/aliases/${source}/${destination}`);
    return response.data;
  } catch (error) {
    if (debug) console.error('api: Error deleting alias:', error);
    throw error;
  }
};

export default api;
