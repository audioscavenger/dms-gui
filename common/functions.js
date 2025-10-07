
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


function obj2ArrayOfObj(obj) {
  return Object.keys(obj).map(key => ({name: key, value: obj[key]}));
  
  // transform this: { a:1, b:2 }
  // to this:        [{name:a,value:1},{name:b,value:2}]
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

// export default (
module.exports = {
  fixStringType,
  arrayOfStringToDict,
  obj2ArrayOfObj,
  reduxArrayOfObj,
  reduxPropertiesOfObj,
};
