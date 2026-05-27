// https://blog.logrocket.com/authentication-react-router-v6/
// To maintain the user’s state even after a page refresh, we create the useLocalStorage Hook, which synchronizes the state value with the browser’s local storage:

// 1.5.21 EDIT: useSyncExternalStore is the recommended way in 2025 to synchronize React state with external stores like localStorage. 
// It ensures your UI stays consistent across multiple browser tabs by subscribing to the global storage event
// you do not need useState if you are using the useSyncExternalStore implementation for localStorage.
// one of the primary reasons to use useSyncExternalStore in 2025 is to remove useState and useEffect duplication.

import { useSyncExternalStore, useRef } from 'react';

/**
 * Custom hook to sync state with localStorage across tabs.
 * @param {string} key - The localStorage key to track.
 * @param {any} initialValue - Default value if key is missing.
 */
// Using null as a default for initialValue makes code harder to work with because "null checks" are needed everywhere
// function useLocalStorage(key, initialValue) {
export const useLocalStorage = (key, initialValue) => {
  // 0. Use a Ref to cache the parsed value and the raw string for comparison
  const cache = useRef({ raw: null, parsed: initialValue });

  // 1. Snapshot for the browser
  // Only check window here to be extra safe, though getSnapshot 
  // is typically only called on the client.
  const getSnapshot = () => {
    if (typeof window === 'undefined') return initialValue;
    
    const raw = localStorage.getItem(key) || initialValue;   // returns null when not exist so let's use initialValue instead
    
    // Check if the raw string changed before parsing
    // if (key == 'containerName') console.debug(`${key}.raw: ${JSON.stringify(cache.current.raw)} == ${JSON.stringify(raw)}`);
    if (cache.current.raw !== raw) {
      cache.current.raw = raw;
      try {
        // If null (key missing), use initialValue; otherwise parse
        cache.current.parsed = (raw !== null) ? JSON.parse(raw) : initialValue;
      
      // catch any parsing error, and they WILL happen; for instance, even though raw is null when key does not exist, its value is still undefined when the if test happens. No idea why.
      } catch (error) {
        cache.current.parsed = initialValue;
      }
    }
    
    return cache.current.parsed;
  };

  // 2. Snapshot for the server (SSR)
  // This prevents the "window is not defined" error during build/render
  const getServerSnapshot = () => initialValue;

  // 3. Subscribe to changes
  const subscribe = (callback) => {
    window.addEventListener('storage', callback);
    return () => window.removeEventListener('storage', callback);
  };

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setState = (newValue) => {
    if (typeof window !== 'undefined') {
      // 1. Correctly evaluate functions using the freshest value from the cache ref
      const valueToStore = typeof newValue === 'function' 
        ? newValue(cache.current.parsed) 
        : newValue;
        
      const serializedValue = JSON.stringify(valueToStore);
      localStorage.setItem(key, serializedValue);

      // 2. CRITICAL FIX: Update the cache ref immediately on the writing tab
      // This forces getSnapshot to realize the data is fresh and bypass the raw !== raw trap
      cache.current.raw = serializedValue;
      cache.current.parsed = valueToStore;

      // 3. Manually notify this tab and other tabs
      window.dispatchEvent(new Event('storage'));
    }
  };

  return [state, setState];
}

/*
bugfix: updating values handled by useLocalStorage does not update them on the UI like useState
Here is what Gemini told me:

Look at this line inside your setState function:
  window.dispatchEvent(new Event('storage'));
When you dispatch this manual storage event, your subscribe listener fires, which immediately forces React to call getSnapshot(). 
Inside getSnapshot, you have this validation check:
  if (cache.current.raw !== raw) { ... }
When you update an object using Direct State Reference (setServerStatus({ ...status, db: { ... } })), you are creating a brand new object. 
But look at what you pass to localStorage.setItem: you stringify it.
If the internal values (like strings, numbers, booleans) inside your stringified JSON look identical or have formatting nuances, or if localStorage.getItem(key) doesn't perfectly mismatch your cached raw string yet, cache.current.raw !== raw can evaluate to false. 
If it evaluates to false, your hook returns the old cached cache.current.parsed reference, completely ignoring your new state object!
Furthermore, your functional state helper newValue instanceof Function ? newValue(state) : newValue is technically supported by your code, but state inside setState is a stale closure from the last render, which breaks state merging.

  const setState = (newValue) => {
    if (typeof window !== 'undefined') {
      // "Boolean-Safe" Hook for storing false values
      // localStorage.setItem(key, JSON.stringify(newValue));
      const valueToStore = newValue instanceof Function ? newValue(state) : newValue;
      localStorage.setItem(key, JSON.stringify(valueToStore));

      // Manually notify this tab since the storage event only fires on other tabs
      window.dispatchEvent(new Event('storage'));
    }
  };


*/

/*
// https://blog.logrocket.com/authentication-react-router-v6/
// To maintain the user’s state even after a page refresh, we create the useLocalStorage Hook, which synchronizes the state value with the browser’s local storage:

import { useState } from 'react';
// import jwt_decode from "jwt-decode";   // we don't need that with HTTP-Only cookies

export const useLocalStorage = (keyName, defaultValue=undefined) => {
  
  const [storedValue, setStoredValue] = useState(() => {
    
    try {
      // SSR Awareness: avoid server-side errors
      if (typeof window !== 'undefined') {

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

      } else return defaultValue;
      
    } catch (error) {
      // console.error(`ddebug error 3 return = ${defaultValue}`, error.message);   // null
      return defaultValue;
    }
  });
  
  const setValue = (newValue) => {
    try {
      // SSR Awareness: avoid server-side errors
      if (typeof window !== 'undefined') {

        // console.debug(`ddebug 4 window.localStorage.setItem(${keyName}), ${JSON.stringify(newValue)}`, newValue);
        // without JWT: user, {"mailbox":"eric@domain.com","username":"eric","email":"","isAdmin":0,"isActive":1,"isAccount":0,"roles":["eric@domain.com"]}
        // with    JWT: user, { accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx" }

        window.localStorage.setItem(keyName, JSON.stringify(newValue));
        // window.localStorage.setItem(keyName, newValue?.accessToken);

      }

    } catch (error) {
      console.error(error.message);
    }
    
    // console.debug(`ddebug 5 setStoredValue(newValue)`, newValue);
    setStoredValue(newValue);
  };
  return [storedValue, setValue];
};
*/