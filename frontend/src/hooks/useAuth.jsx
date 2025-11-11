// https://blog.logrocket.com/authentication-react-router-v6/
// checks the current user’s state from the useAuth Hook and redirects them to the home screen if they are not authenticated:

import React, { createContext, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from './useLocalStorage';
const AuthContext = createContext();
import {
  logoutUser,
} from '../services/api.mjs';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage("user", null);
  // const [user, setUser] = useLocalStorage("accessToken", null);    // with JWT
  const navigate = useNavigate();

  // call this function when you want to authenticate the user
  // const login = async (username, to="/") => {
  const login = async (user, to="/") => {
    
    console.debug('ddebug setUser(user)', user);
    setUser(user);
    
    // console.debug('ddebug navigate /');
    navigate(to);
  };

  // call this function to sign out logged in user
  const logout = async (to="/login") => {
    console.debug('ddebug /logout');
    // setUser(null);
    logoutUser();
    window.localStorage.clear();
    navigate(to, { replace: true });
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
    }),
    [user]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  // console.debug('ddebug useAuth AuthContext');
  return useContext(AuthContext);
};
