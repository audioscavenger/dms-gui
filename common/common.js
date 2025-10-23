
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


function arrayOfStringToDict(array, separator) {
  var dict={};
  
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


function obj2ArrayOfObj(obj, stringify=false, props=['name','value']) {
  return (stringify) ? Object.keys(obj).map(key => ({[props[0]]: key, [props[1]]: String(obj[key])})) : Object.keys(obj).map(key => ({[props[0]]: key, [props[1]]: obj[key]}));
  
  // transform this: { a:1, b:2, .. }
  // to this:        [ {name:"a",value:1}, {name:"b",value:2}, .. ]
}


function reduxArrayOfObj(obj, arrayToKeep) {
// this will reduce:
  // data = [
  // {name: 'John', city: 'London', age: 42},
  // {name: 'Mike', city: 'Warsaw', age: 18},
  // ]
// keeping:
  // arrayToKeep = ['name', 'city']
// to:
  // data = [
  // {name: 'John', city: 'London'},
  // {name: 'Mike', city: 'Warsaw'},
  // ]

  const redux = array => array.map(o => keys_to_keep.reduce((acc, curr) => {
    acc[curr] = o[curr];
    return acc;
  }, {}));
  
  return redux(obj);
}

function reduxPropertiesOfObj(obj, arrayToKeep) {
// this will reduce:
  // const person = {
  // firstName: 'Orpheus',
  // lastName: 'De Jong',
  // phone: '+1 123-456-7890',
  // email: 'fake@email.tld',
  // }
// keeping:
  // arrayToKeep = ['firstName', 'lastName']
// to:
  // person = {
  // firstName: 'Orpheus',
  // lastName: 'De Jong',
  // email: 'fake@email.tld',
  // }

  const allKeys = Object.keys(obj);
  return allKept = allKeys.reduce((next, key) => {
    if (arrayToKeep.includes(key)) {
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
    // a = [{name: 1,value: "odd"}]
    // b = [{name: 1,value: "wrong"},{name: 2,value: "xyz"}]
  // into:
    // output = [{name: 1,value: "wrong"},{name: 2,value: "xyz"}]

  const reduced = (a.length) ? a.filter(aitem => !b.find(bitem => aitem[prop] === bitem[prop])) : [];
  return reduced.concat(b);
}


function getValueFromArrayOfObj(arr, propName, keyName='name', keyValue='value') {
  // this will return the value from an array of objects like [ {keyName: propName, keyValue: value}, .. ]
  if (!Array.isArray(arr)) return undefined;
  return (arr.find(item => item[keyName] == propName)) ? arr.find(item => item[keyName] == propName)[keyValue] : undefined;
}


function pluck(arr, keyValue, uniq=true) {
  // this will return the values from an array of objects like [ {keyName: propName, keyValue: value}, .. ]
  if (!Array.isArray(arr)) return undefined;
  let values = arr.map(item => item[keyValue]);
  return (uniq) ? [... new Set(values)] : values;
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


module.exports = {
  funcName,
  fixStringType,
  arrayOfStringToDict,
  obj2ArrayOfObj,
  reduxArrayOfObj,
  reduxPropertiesOfObj,
  mergeArrayOfObj,
  getValueFromArrayOfObj,
  pluck,
  byteSize2HumanSize,
  humanSize2ByteSize,
};
