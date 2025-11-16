// https://blog.logrocket.com/authentication-react-router-v6/
// To maintain the user’s state even after a page refresh, we create the useLocalStorage Hook, which synchronizes the state value with the browser’s local storage:


import { useState } from 'react';
// import jwt_decode from "jwt-decode";   // we don;t need that with HTTP-Only cookies

export const useLocalStorage = (keyName, defaultValue=undefined) => {
  
  const [storedValue, setStoredValue] = useState(() => {
    
    try {
      const value = window.localStorage.getItem(keyName);
      
      if (value) {
        // console.debug(`ddebug 1 return window.localStorage.getItem(${keyName})=`, value);
        // without JWT: "user":         '{"mailbox":"eric@domain.com","username":"eric","email":"","isAdmin":0,"isActive":1,"isAccount":0,"roles":["eric@domain.com"]}'
        // with    JWT: "accessToken":  null
        
        // const decodedToken = jwt_decode(value);
        // console.debug('ddebug 1b decodedToken', decodedToken);
        // return JSON.parse(decodedToken);
        
        return JSON.parse(value);
        
      } else {
        // console.debug(`ddebug 2 window.localStorage.setItem(${keyName}, JSON.stringify(${JSON.stringify(defaultValue)}))`);
        // window.localStorage.setItem(keyName, JSON.stringify(defaultValue));
        
        // console.debug(`ddebug 2 window.localStorage.removeItem(${keyName})`);
        window.localStorage.removeItem(keyName);
        
        return defaultValue;
      }
      
    } catch (error) {
      // console.error(`ddebug error 3 return = ${defaultValue}`, error.message);   // null
      return defaultValue;
    }
  });
  
  const setValue = (newValue) => {
    try {
      // console.debug(`ddebug 4 window.localStorage.setItem(${keyName}), ${JSON.stringify(newValue)}`, newValue);
      // without JWT: user, {"mailbox":"eric@domain.com","username":"eric","email":"","isAdmin":0,"isActive":1,"isAccount":0,"roles":["eric@domain.com"]}
      // with    JWT: user, { accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx" }

      window.localStorage.setItem(keyName, JSON.stringify(newValue));
      // window.localStorage.setItem(keyName, newValue?.accessToken);
      
    } catch (error) {
      console.log(error.message);
    }
    
  // console.debug(`ddebug 5 setStoredValue(newValue)`, newValue);
  setStoredValue(newValue);
  };
  return [storedValue, setValue];
};
