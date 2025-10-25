const debug = true;

const {
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
} = require('./common');


const ICON = {
  success:  '✔️',
  error:    '❌',
  warn:     '🔺',
  info:     '💬',
  debug:    '🔎',
}
const LEVEL = {
  success:  '[SUCCESS]',
  error:    '[ERROR]  ',
  warn:     '[WARNING]',
  info:     '[INFO]   ',
  debug:    '[DEBUG]  ',
}
async function logger(level, message='', data = '') {
  console[level](ICON[level], LEVEL[level], message, data);
}
async function successLog(message, data = '') { logger('success', message, data) }
async function errorLog(message, data = '') { logger('error', message, data) }
async function warnLog(message, data = '') { logger('warning', message, data) }
async function infoLog(message, data = '')  { logger('info', message, data) }
async function debugLog(message, data = '') { if (debug) logger('debug', message, data) }
// TODO: add colors: console.log('%c Sample Text', 'color:green;')


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
  debug,
  ICON,
  debugLog,
  infoLog,
  warnLog,
  errorLog,
  successLog,
};
