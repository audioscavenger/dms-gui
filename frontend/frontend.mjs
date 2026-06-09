export const debug = true; 

export const ICON = {
  success: '✔️',
  error: '❌',
  warn: '🔺',
  info: '💬',
  debug: '🔎',
}

export const LEVEL = {
  success: '[SUCCESS]',
  error: '[ERROR]  ',
  warn: '[WARNING]',
  info: '[INFO]   ',
  debug: '[DEBUG]  ',
}

// 1. Direct top-level bindings. Because they are bound directly without an arrow function, 
// the browser devtools will bypass frontend.mjs completely and display your actual page.
export const successLog = Function.prototype.bind.call(console.log, console, ICON.success, LEVEL.success);
export const errorLog   = Function.prototype.bind.call(console.error, console, ICON.error, LEVEL.error);
export const warnLog    = Function.prototype.bind.call(console.warn, console, ICON.warn, LEVEL.warn);
export const infoLog    = Function.prototype.bind.call(console.info, console, ICON.info, LEVEL.info);

// 2. Conditional debug handler
// A blank dummy function prevents app execution from crashing if debugging is disabled
const dummyNoOp = () => {};

export const debugLog = debug 
  ? Function.prototype.bind.call(console.debug, console, ICON.debug, LEVEL.debug)
  : dummyNoOp;

// 3. Fallback generic legacy helper
export const logger = async (level, message = '', data = '') => {
  if (level === 'debug' && !debug) return;
  
  const methods = { success: 'log', error: 'error', warn: 'warn', info: 'info', debug: 'debug' };
  const targetMethod = methods[level] || 'log';
  
  if (data) {
    console[targetMethod](ICON[level], LEVEL[level], message, data);
  } else {
    console[targetMethod](ICON[level], LEVEL[level], message);
  }
};
