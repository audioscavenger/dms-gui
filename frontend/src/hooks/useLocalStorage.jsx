// https://blog.logrocket.com/authentication-react-router-v6/
// To maintain the user’s state even after a page refresh, let’s create the useLocalStorage Hook, which synchronizes the state value with the browser’s local storage:

import { useState } from 'react';

export const useLocalStorage = (keyName, defaultValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const value = window.localStorage.getItem(keyName);
      if (value) {
        return JSON.parse(value);
      } else {
        window.localStorage.setItem(keyName, JSON.stringify(defaultValue));
      console.debug('ddebug setValue window.localStorage keyName,defaultValue',keyName,defaultValue);
        return defaultValue;
      }
    } catch (err) {
      return defaultValue;
    }
  });
  const setValue = (newValue) => {
    try {
      window.localStorage.setItem(keyName, JSON.stringify(newValue));
      console.debug('ddebug setValue window.localStorage',window.localStorage);
    } catch (err) {
      console.log(err);
    }
    setStoredValue(newValue);
  };
  return [storedValue, setValue];
};
