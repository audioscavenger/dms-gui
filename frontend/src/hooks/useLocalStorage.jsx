// https://blog.logrocket.com/authentication-react-router-v6/
// To maintain the user’s state even after a page refresh, let’s create the useLocalStorage Hook, which synchronizes the state value with the browser’s local storage:

import { useState } from 'react';

export const useLocalStorage = (keyName, defaultValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const value = window.localStorage.getItem(keyName);
      if (value) {
        console.debug('ddebug 1 return window.localStorage value', value);
        return JSON.parse(value);
      } else {
        window.localStorage.setItem(keyName, JSON.stringify(defaultValue));
        console.debug('ddebug 2 setValue window.localStorage keyName,defaultValue', keyName, defaultValue);
        return defaultValue;
      }
      
    } catch (err) {
      console.debug('ddebug 3 window.localStorage defaultValue', defaultValue);
      return defaultValue;
    }
  });
  
  const setValue = (newValue) => {
    try {
      console.debug('ddebug 4 window.localStorage.setItem(keyName, JSON.stringify(newValue))', keyName, newValue);
      window.localStorage.setItem(keyName, JSON.stringify(newValue));
      
    } catch (err) {
      console.log(err);
    }
    setStoredValue(newValue);
  };
  return [storedValue, setValue];
};
