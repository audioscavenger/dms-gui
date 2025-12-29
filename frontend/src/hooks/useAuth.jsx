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

export const AuthProvider = ({ children }) => {
  const [isDEMO, setIsDEMO] = useLocalStorage("isDEMO", false);
  const [containerName, setContainerName] = useLocalStorage("containerName", '');
  const [mailservers, setMailservers] = useLocalStorage("mailservers", []);
  const [user, setUser] = useLocalStorage("user", null);
  const navigate = useNavigate();

  // call this function when you want to authenticate the user
  // const login = async (username, to="/") => {
  const login = async (passedUser, to="/") => {
    
    debugLog('useAuth passedUser', passedUser);
    setUser(passedUser);

    // set current mailserver container
    if (passedUser?.mailserver) {
      setContainerName(passedUser.mailserver);

    // no user favorite? pick the first one in the list if any
    } else if (mailservers.length && !passedUser?.mailserver) setContainerName(getValueFromArrayOfObj(mailservers, 'value'));

    setIsDEMO(passedUser?.isDEMO);
    
    debugLog(`useAuth navigate to ${to}`);
    navigate(to);
  };

  // call this function to sign out logged in user
  const logout = async (to="/login") => {
    // debugLog('useAuth /logout');
    // setUser(null);
    logoutUser();
    window.localStorage.clear();
    // navigate(to, { replace: true }); // To get rig of menus and navbar profile, we need to reload, not navigate
    window.location.replace(to);
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
    [user, containerName, mailservers]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  // debugLog('useAuth AuthContext');
  return useContext(AuthContext);
};
