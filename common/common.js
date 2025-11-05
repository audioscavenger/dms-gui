
// not const so they are exported and we don't have to mention them
regexColors = /\x1b\[[0-9;]*[mGKHF]/g;
// regexPrintOnly = /[\x00-\x1F\x7F-\x9F\x20-\x7E]/;
regexPrintOnly = /[^\S]/;

regexFindEmailRegex = /\/[\S]+@[\S]+\//;
regexFindEmailStrict = /([\w\.\-_]+)@([\w\.\-_]+)/;
regexFindEmailLax = /([\S]+)@([\S]+)/;
regexEmailRegex = /^\/[\S]+@[\S]+\/$/;
regexEmailStrict = /^([\w\.\-_]+)@([\w\.\-_]+)$/;
regexEmailLax = /^([\S]+)@([\S]+)$/;

regexMatchPostfix = /(\/[\S]+@[\S]+\/)[\s]+([\w\.\-_]+@[\w\.\-_]+)/;
regexUsername = /^[^\s]+$/;


function funcName(parent=4) {
  const err = new Error();
  // The stack trace is formatted differently depending on the Node.js version.
  // We grab the line with the caller's function name.
  const callerLine = err.stack.split('\n')[parent];
  
  // This regular expression works well for many Node.js stack formats.
  // It looks for "at <functionName>".
  const match = /at\s+([^ ]+)/.exec(callerLine);
  
  if (match && match[1]) {
    return match[1];
  }
  return 'anonymous';
}


function fixStringType(string) {
  output = parseInt(string) ? parseInt(string) : string;
  return output;
}


function arrayOfStringToDict(array=[], separator=',') {
  // transform ["a=1", "b=2", ..] => {a:1, b:2, ..}
  
  var dict={};
  
  if (typeof array == "string") {
    array = array.split(/\r?\n/);
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

}


function obj2ArrayOfObj(obj={}, stringify=false, props=['name','value']) {
  return (stringify) ? Object.keys(obj).map(key => ({[props[0]]: key, [props[1]]: String(obj[key])})) : Object.keys(obj).map(key => ({[props[0]]: key, [props[1]]: obj[key]}));
  
  // transform this: { a:1, b:2, .. }
  // to this:        [ {name:"a",value:1}, {name:"b",value:2}, .. ]
}


function reduxArrayOfObjByKey(array=[], keys2Keep=[]) {
// this will reduce:
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

  if (typeof keys2Keep == "string") keys2Keep = [keys2Keep];
  const redux = array => array.map(o => keys2Keep.reduce((acc, curr) => {
    acc[curr] = o[curr];
    return acc;
  }, {}));
  
  return redux(array);
}

function reduxArrayOfObjByValue(array=[], key, values2Keep=[]) {
// this will reduce:
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

  if (typeof values2Keep == "string") values2Keep = [values2Keep];
  return array.filter(item => values2Keep.includes(item[key]));
  
}

function reduxPropertiesOfObj(obj={}, keys2Keep=[]) {
// this will reduce:
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

  if (typeof keys2Keep == "string") keys2Keep = [keys2Keep];
  const allKeys = Object.keys(obj);
  return allKept = allKeys.reduce((next, key) => {
    if (keys2Keep.includes(key)) {
      return { ...next, [key]: obj[key] };
    } else {
      return next;
    }
  }, {});
  
}

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
function mergeArrayOfObj(a=[], b=[], prop='name') {
  // this will merge:
    // a =      [{name: 1,value: "orig"}]
    // b =      [{name: 1,value: "new"}, {name: 2,value: "new"}]
  // into:
    // output = [{name: 1,value: "new"}, {name: 2,value: "new"}]
  if (!Array.isArray(a)) a = [a];
  if (!Array.isArray(b)) b = [b];
  const reduced = (a.length) ? a.filter(aitem => !b.find(bitem => aitem[prop] === bitem[prop])) : [];
  return reduced.concat(b);
}

// this will return the FIRST value from an array of objects like arr = [ {name: propValue, value: value1}, {name: prop2, value: value2}, .. ] => "value1"
function getValueFromArrayOfObj(arr, propValue, keyName='name', keyValue='value') {
  if (!Array.isArray(arr)) return undefined;
  return (arr.find(item => item[keyName] == propValue)) ? arr.find(item => item[keyName] == propValue)[keyValue] : undefined;
}


// this will return the FIRST value from an array of objects like arr = [ {name: propValue, value: value1}, {name: prop2, value: value2}, .. ] => ["value1"]
function getValuesFromArrayOfObj(arr, propValue, keyName='name', keyValue='value') {
  if (!Array.isArray(arr)) return undefined;
  let output = [];
  for (const item of arr.filter(item => item[keyName] == propValue)) {
    output.push(item[keyValue]);
  }
  return output;
}


// this will return the (uniq) and/or (sorted) values from an array of objects like [ {keyName: propName, keyValue: value1}, .. ] => [value1, ..]
function pluck(arr, keyValue, uniq=true, sorted=true) {
  if (!Array.isArray(arr)) return undefined;
  let values = arr.map(item => item[keyValue]);
  let uniqValues = (uniq) ? [... new Set(values)] : values;
  return (sorted) ? uniqValues.sort() : uniqValues;
}


function byteSize2HumanSize(bytes) {
  if (bytes === 0) return '0B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return parseFloat((bytes / Math.pow(1024, i)).toFixed()) + sizes[i];
}


function humanSize2ByteSize(humanBytes) {
  const sizes = [/(\S+)B/i, /(\S+)KB?/i, /(\S+)MB?/i, /(\S+)GB?/i, /(\S+)TB?/i, /(\S+)PB?/i, ];
  for (const [power, regex] of Object.entries(sizes).reverse()) {
    // cannot use split as sometimes the B is missing
    // let split = humanBytes.split(regex);
    // if (split.length > 1) return parseFloat(split[0]) * Math.pow(1024, power);
    let match = humanBytes.match(regex);
    if (match) return (match[1] * Math.pow(1024, power)).toFixed();
  }
  return 0;
}


function moveKeyToLast(obj, keyToMove) {
  // Check if the key exists in the object
  if (Object.prototype.hasOwnProperty.call(obj, keyToMove)) {
    const valueToMove = obj[keyToMove]; // Store the value
    delete obj[keyToMove]; // Delete the key
    obj[keyToMove] = valueToMove; // Re-add the key, placing it last
  }
  return obj;
}


module.exports = {
  funcName,
  fixStringType,
  arrayOfStringToDict,
  obj2ArrayOfObj,
  reduxArrayOfObjByKey,
  reduxArrayOfObjByValue,
  reduxPropertiesOfObj,
  mergeArrayOfObj,
  getValueFromArrayOfObj,
  getValuesFromArrayOfObj,
  pluck,
  byteSize2HumanSize,
  humanSize2ByteSize,
  moveKeyToLast,
};
