// not const so they are exported and we don't have to mention them
export const regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
export const regexPrintOnly = /[^\S]/;

export const regexFindEmailStrict = /^(?=^.{1,254}$)([\w\.\-_]+)@([\w\.\-_]+\.[\w]+)$/;     // example: x@y.z
export const regexFindEmailRegex = /^\/([\S]+@[\S]+)\/$/;                                   // example: /abuse@*/
export const regexExtractEmail = /\b(?=[^\s]{3,254}\b)([\w\.\-_]+)@([\w\.\-_]+\.[\w]+)/g;   // extract email matches out of long paragraphs
// export const regexEmailStrict = /^[\w\.\-_]+@[\w\.\-_]+\.[\w]+$/;
export const regexEmailStrict = /^(?=^.{1,254}$)([\w\.\-_]+@[\w\.\-_]+\.[\w]+)$/;           // example: x@y.z
export const regexEmailRegex = /^\/[\S]+@[\S]+\/$/;                                         // example: /abuse@*/

export const regexMatchPostfix = /(\/[\S]+@[\S]+\/)[\s]+([\w\.\-_]+@[\w\.\-_]+\.[\w]+)/;    // example: /^postmaster.*@.*.*/ admin@example.com
// export const regexUsername = /^[^\s]+$/;
export const regexUsername = /^(?=^.{1,36}$)[\w\.\-_]+$/;

// import {
//   regexColors,
//   regexPrintOnly,
//   regexFindEmailStrict,
//   regexEmailStrict,
//   regexMatchPostfix,
//   regexUsername,
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
//   getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
// } from '../common.mjs'


export const funcName = (parent=4, onlyParent=false) => {
  const error = new Error();
  let match, funcName;

  // The stack trace is formatted differently depending on the Node.js version.
  // We grab the line with the caller's function name.
  const errorLines = error.stack.split('\n');
  for (let i = parent; i <= errorLines.length; i++) {
    // This regular expression works well for many Node.js stack formats.
    // It looks for "at <functionName>".
    // match = /at\s+([^ ]+)\s+/.exec(errorLines[i]);
    match = /at\s+(\w+)\s+/.exec(errorLines[i]);

    // append indentation to parent function until we reach 
    if (match) {
      funcName = (funcName) ? "  " + funcName : match[1];
      if (onlyParent) break;

    // either we reached the end or it was anonymous == root from the main script
    } else {
      funcName = (funcName) ? funcName : errorLines[i];
      break;
    }
      
  }
  
  return funcName;
};
// error Error
//     at funcName (file:///app/common.mjs:44:17)
//     at logger (file:///app/backend/backend.mjs:86:134)
//     at debugLog (file:///app/backend/backend.mjs:93:70)
//     at dbGet (file:///app/backend/db.mjs:783:7)
//     at dbUpgrade (file:///app/backend/db.mjs:877:16)
//     at dbInit (file:///app/backend/db.mjs:854:5)
//     at Server.<anonymous> (file:///app/backend/index.js:1809:3)
//     at Server.f (/app/backend/node_modules/once/once.js:25:25)
//     at Object.onceWrapper (node:events:622:28)
//     at Server.emit (node:events:520:35)


export const fixStringType = string => {
  return Number(string) ? Number(string) : string;
};


export const jsonFixTrailingCommas = (jsonString, returnJson=false) => {
  var jsonObj;
  eval('jsonObj = ' + jsonString);
  if (returnJson) return jsonObj;
  else return JSON.stringify(jsonObj);
};


export const arrayOfStringToDict = (array=[], separator=',') => {
  // transform ["a=1", "b=2", ..] => {a:1, b:2, ..}
  
  if (!array.length) return [];
  let dict={};
  
  if (!Array.isArray(array)) {
    if (typeof array == "string") {
      array = array.split(/\r?\n/);
    
    // that's an error
    } else return [];
  }
  
  array.map((item) => {
    let split = item.split(separator);
    if (split.length == 2) {
      dict[split[0]] = fixStringType(split[1]);
    }
  });
  return dict;
  
  // dict = array.map((item) => ({ [item.split('=')[0]]: item.split('=')[1] }));
    // dict = [{ ENABLE_RSPAMD: "1" },{ ENABLE_XAPIAN: "1" },{ ENABLE_MTA_STS: "0" },{ PERMIT_DOCKER: "none" },{ DOVECOT_MAILBOX_FORMAT: "mailbox" }]

  // array.map((item) => (dict[item.split('=')[0]] = item.split('=')[1] ));
    // dict = { ENABLE_RSPAMD: "1", ENABLE_XAPIAN: "1", ENABLE_MTA_STS: "0", PERMIT_DOCKER: "none", DOVECOT_MAILBOX_FORMAT: "mailbox" }

};


export const obj2ArrayOfObj = (obj={}, stringify=false, props=['name','value']) => {
  return (stringify) ? Object.keys(obj).map(key => ({[props[0]]: key, [props[1]]: String(obj[key])})) : Object.keys(obj).map(key => ({[props[0]]: key, [props[1]]: obj[key]}));
  
  // transform this: { a:1, b:2, .. }
  // to this:        [ {name:"a",value:1}, {name:"b",value:2}, .. ]
};


// reduxArrayOfObjByKey will reduce:
  // data = [
  // {name: 'John', city: 'London', age: 42},
  // {name: 'Mike', city: 'Warsaw', age: 18},
  // ]
// keeping:
  // keys2Keep = ['name']
// to:
  // data = [
  // {name: 'John'},
  // {name: 'Mike'},
  // ]
export const reduxArrayOfObjByKey = (array=[], keys2Keep=[]) => {

  if (!Array.isArray(array) || !array.length) return [];

  // 1. Force keys2Keep into a clean array structure, handling null/undefined/objects/strings
  let normalizedKeys = [];
  if (Array.isArray(keys2Keep)) {
    normalizedKeys = keys2Keep;
    
  } else if (keys2Keep !== null && keys2Keep !== undefined) {
    normalizedKeys = [keys2Keep]; // Handles strings, numbers, etc.
  }
  
  // 2. Map over the array and rebuild objects with only the requested keys
  return array.map(obj => 
    normalizedKeys.reduce((acc, currentKey) => {
      // Only copy the property if it actually exists in the source object
      if (obj && Object.prototype.hasOwnProperty.call(obj, currentKey)) {
        acc[currentKey] = obj[currentKey];
      }
      return acc;
    }, {})
  );

};

// reduxArrayOfObjByValue will reduce (or filter out) Object entries by the value of a key:
  // data = [
  // {name: 'John', city: 'London', age: 42},
  // {name: 'Mike', city: 'Warsaw', age: 18},
  // ]
// keeping:
  // key = "city"
  // values2Keep = ['London']
// to:
  // data = [
  // {name: 'John', city: 'London', age: 42},
  // ]
export const reduxArrayOfObjByValue = (array=[], key, values2Keep=[], invert = false) => {

  if (!array.length) return [];
  // Normalize string inputs to an array
  values2Keep = Array.isArray(values2Keep) ? values2Keep : [values2Keep];

  // 2. Convert to a Set for blazing-fast O(1) lookups
  const valuesSet = new Set(values2Keep);

  return array.filter(item => {
    // --- CHANGE .includes TO .has HERE ---
    const hasMatch = valuesSet.has(item[key]); 
    
    // If invert is true, invert the match behavior (remove matching items)
    return invert ? !hasMatch : hasMatch;
  });  
};

// reduxPropertiesOfObj will reduce:
// const person = {
      // firstName: 'firstName',
      // lastName:  'lastName',
      // email:     'fake@email.tld',
      // }
// keeping:
  // keys2Keep = ['firstName']
// to:
  // person = {
  // firstName: 'firstName',
  // }
export const reduxPropertiesOfObj = (obj={}, keys2Keep=[]) => {

  keys2Keep = Array.isArray(keys2Keep) ? keys2Keep : [keys2Keep];
  const allKeys = Object.keys(obj);

  return allKeys.reduce((next, key) => {
    if (keys2Keep.includes(key)) {
      return { ...next, [key]: obj[key] };
    } else {
      return next;
    }
  }, {});
  
};

/*
// ES5 using Array.filter and Array.find
function mergeArrayOfObj(a, b, prop) {
// this will merge:
  // a = [{name: 1,value: "odd"}]
  // b = [{name: 1,value: "wrong"},{name: 2,value: "xyz"}]
// into:
  // output = [{name: 1,value: "wrong"},{name: 2,value: "xyz"}]

var reduced = a.filter(function(aitem) {
  return !b.find(function(bitem) {
    return aitem[prop] === bitem[prop];
  });
});
return reduced.concat(b);}
*/

// ES6 arrow functions
export const mergeArrayOfObj = (a=[], b=[], prop='name') => {
  // this will merge:
    // a =      [{name: 1,value: "orig"}]
    // b =      [{name: 1,value: "new"}, {name: 2,value: "new"}]
  // into:
    // output = [{name: 1,value: "new"}, {name: 2,value: "new"}]
  if (!a || !b) return [];
  
  if (!Array.isArray(a)) a = [a];
  if (!Array.isArray(b)) b = [b];
  const reduced = (a.length) ? a.filter(aitem => !b.find(bitem => aitem[prop] === bitem[prop])) : [];
  return reduced.concat(b);
};

// this will return the FIRST value found in a list of props, from an array of objects like:
// array = [ {name: propValue, value: value1}, {name: prop2, value: value2}, .. ] => "value1"
export const getValueFromArrayOfObj = (array, propValues, keyName='name', keyValue='value') => {
  if (!Array.isArray(array)) return null;

  // if (!Array.isArray(propValues)) propValues = [propValues];
  // return foundItem ? foundItem[keyValue] : null;  return (array.find(item => propValues.includes(item[keyName]) )) ? array.find(item => propValues.includes(item[keyName]))[keyValue] : null;

  const valuesSet = new Set(Array.isArray(propValues) ? propValues : [propValues]);
  const foundItem = array.find(item => valuesSet.has(item[keyName]));
  return foundItem ? foundItem[keyValue] : null;

};


// this will return ALL the keyValue found in a list of props, from an array of objects like:
// array = [ {name: 'prop1', value: 'value1'}, {name: 'prop2', value: 'value2'}, {name: 'prop1', value: 'value3'} ]
// getValuesFromArrayOfObj(array, 'prop1') = ["value1", "value3"]
export const getValuesFromArrayOfObj = (array, propValues, keyName = 'name', keyValue = 'value') => {
  if (!Array.isArray(array)) return [];
  
  // Ensure propValues is always an array for comparison
  const searchValues = Array.isArray(propValues) ? propValues : [propValues];
  console.log("Evaluating Array:", JSON.stringify(array));

  // return array
    // .filter(item => searchValues.includes(item[keyName]))
    // .map(item => item[keyValue]);
  const searchSet = new Set(searchValues);
  return array
    .filter(item => searchSet.has(item[keyName]))
    .map(item => item[keyValue]);
};


// this will return ALL the values for key=keyName
// array = [ {name: 'prop1', value: 'value1'}, {name: 'prop2', value: 'value2'}, {name: 'prop1', value: 'value3'} ]
// getAllValuesByKey(array, 'name')       = ["prop1", "prop2", "prop1"]
// getAllValuesByKey(array, 'name', true) = ["prop1", "prop2"]
export const getAllValuesByKey = (array, keyName = 'name', keepUnique = false) => {
  if (!Array.isArray(array)) return [];
  
  const values = array.map(item => item[keyName]);
  
  // If true, pass the array through a Set to filter out duplicates
  return keepUnique ? [...new Set(values)] : values;
};


// keep only the strings that exist in another array
// myStrings = ['apple', 'banana', 'cherry', 'date']; allowed = ['banana', 'date', 'elderberry'];
// keepMatchingStrings(myStrings, allowed) = ['banana', 'date']
export const keepMatchingStrings = (sourceArray, allowedArray) => {
  if (!Array.isArray(sourceArray) || !Array.isArray(allowedArray)) return [];

  // Creating a Set optimizes performance for the lookup
  const allowedSet = new Set(allowedArray);

  return sourceArray.filter(item => allowedSet.has(item));
};


// this will return the (uniq) and/or (sorted) value(s) from an array of objects like [ {keyName: propName, keyValue: value1}, .. ] => [value1, ..]
export const pluck = (array, keyValue='value', uniq=true, sorted=true) => {
  if (!Array.isArray(array)) return null;
  let values = array.map(item => item[keyValue]);
  let uniqValues = (uniq) ? [... new Set(values)] : values;
  return (sorted) ? uniqValues.sort() : uniqValues;
};

// shortcut to get a set of uniq, unsorted values
export const plucks = (array, keyValue='value') => {
  if (!Array.isArray(array)) return null;
  let values = array.map(item => item[keyValue]);
  return new Set(values);
};


export const byteSize2HumanSize = bytes => {
  if (bytes === 0) return '0B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed()) + sizes[i];
};


export const humanSize2ByteSize = humanBytes => {
  const sizes = [/(\S+)B/i, /(\S+)KB?/i, /(\S+)MB?/i, /(\S+)GB?/i, /(\S+)TB?/i, /(\S+)PB?/i, ];
  for (const [power, regex] of Object.entries(sizes).reverse()) {
    // cannot use split as sometimes the B is missing
    // let split = humanBytes.split(regex);
    // if (split.length > 1) return parseFloat(split[0]) * Math.pow(1024, power);
    let match = humanBytes.match(regex);
    if (match) return (match[1] * Math.pow(1024, power)).toFixed();
  }
  return 0;
};


export const moveKeyToLast = (obj, keyToMove) => {
  // Check if the key exists in the object
  if (Object.prototype.hasOwnProperty.call(obj, keyToMove)) {
    const valueToMove = obj[keyToMove]; // Store the value
    delete obj[keyToMove]; // Delete the key
    obj[keyToMove] = valueToMove; // Re-add the key, placing it last
  }
  return obj;
};


// isNonEmptyDict returns the number of keys in non empty objects == true
export const isNonEmptyDict = (obj) => 
  obj?.constructor === Object && Object.keys(obj).length;


// module.exports = {
//   funcName,
//   fixStringType,
//   arrayOfStringToDict,
//   obj2ArrayOfObj,
//   reduxArrayOfObjByKey,
//   reduxArrayOfObjByValue,
//   reduxPropertiesOfObj,
//   mergeArrayOfObj,
//   getValueFromArrayOfObj,
//   getValuesFromArrayOfObj,
//   pluck,
//   byteSize2HumanSize,
//   humanSize2ByteSize,
//   moveKeyToLast,
// };
