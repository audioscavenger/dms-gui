// https://blog.logrocket.com/authentication-react-router-v6/
// checks the current user’s state from the useAuth Hook and redirects them to the home screen if they are not authenticated:

import React, { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';
const AuthContext = createContext();
import {
  logoutUser,
} from '../services/api.mjs';
import { debugLog } from '../../frontend.mjs';
import { getValueFromArrayOfObj } from '../../../common.mjs';

export const AuthProvider = ({ children }) => {
  const [isDEMO, setIsDEMO] = useLocalStorage("isDEMO", false);
  const [containerName, setContainerName] = useLocalStorage("containerName", '');
  const [mailservers] = useLocalStorage("mailservers", []);
  const [user, setUser] = useLocalStorage("user", null);
  const navigate = useNavigate();

  // call this function when you want to authenticate the user
  const login = async (passedUser, to="/") => {
    
    debugLog('useAuth passedUser', passedUser);
    setUser(passedUser);

    // set current mailserver container
    if (passedUser?.mailserver) {
      setContainerName(passedUser.mailserver);

    // no user favorite? pick the first one in the list if any
    } else if (mailservers.length && !passedUser?.mailserver) setContainerName(getValueFromArrayOfObj(mailservers, 'value'));

    setIsDEMO(passedUser?.isDEMO);
    
    if (to !== null) {
      debugLog(`useAuth navigate to ${to}`);
      navigate(to);
    }
  };

  // call this function to sign out logged in user
  const logout = async (to="/login") => {
    // 1. Instantly clear frontend local storage so that a refresh will not load stale data on initialization boots
    // no need to setUser(null) since it's in localStorage
    window.localStorage.clear();

    try {
      // 2. Safely alert backend in the background
      await logoutUser();

    } catch (err) {
      // Silently catch any leftover trace so the UI doesn't break
      console.debug("Logout cleanup, ignored error:", err.message);
      
    } finally {
      // 3. Perform the clean redirect and wipe layouts out of memory
      window.location.replace(to);
    }
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      containerName,
      mailservers,
      isDEMO,
    }),
    [user, containerName, mailservers, isDEMO, login]
  );
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
};

export const useAuth = () => {
  // debugLog('useAuth AuthContext');
  return useContext(AuthContext);
};
