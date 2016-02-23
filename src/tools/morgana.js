'use strict';

const auth = require('basic-auth');
const _ = require('lodash');

module.exports = morgana;
module.exports.compile = compile;
module.exports.format = format;
module.exports.token = token;

/**
 * HTTP logger derived from bunyan
 *
 * @param {object} log Bunyan logger instance
 * @param {string} format format to be used in the logger
 * @return {void}
 */
function morgana(log, format) {

  // Default format is common
  const fmt = _.isString(format) ? format : 'common';
  const formatLine = getFormatFunction(fmt);

  return function logger(req, res, next) {
    let line = formatLine(morgana, req, res);
    log.info(line);
    next();
  };
}


/**
 * Apache combined log format.
 */
morgana.format('combined', ':remote-addr - :remote-user ' +
  '":method :url HTTP/:http-version" :status :res[content-length] ' +
  '":referrer" ":user-agent"');

/**
 * Apache common log format.
 */
morgana.format('common', ':remote-addr - :remote-user ":method' +
  ' :url HTTP/:http-version" :status :res[content-length]');

/**
 * Short format.
 */
morgana.format('short', ':remote-addr :remote-user :method :url ' +
  'HTTP/:http-version :status :res[content-length] - :response-time ms');

/**
 * Tiny format.
 */
morgana.format('tiny', ':method :url :status :res[content-length] - ' +
  ':response-time ms');

/**
 * dev (colored)
 */
morgana.format('dev', function developmentFormatLine(tokens, req, res) {
  // get the status code if response written
  var status = res._header
    ? res.statusCode
    : undefined;

  // get status color
  var color = status >= 500 ? 31 // red
    : status >= 400 ? 33 // yellow
    : status >= 300 ? 36 // cyan
    : status >= 200 ? 32 // green
    : 0 ;// no color

  // get colored function
  var fn = developmentFormatLine[color];

  if (!fn) {
    // compile
    fn = developmentFormatLine[color] = compile('\x1b[0m:method :url \x1b['
      + color + 'm:status \x1b[0m:response-time ms - ' +
      ':res[content-length]\x1b[0m');
  }

  return fn(tokens, req, res);
});

/**
 * request url
 */
morgana.token('url', function getUrlToken(req) {
  return req.originalUrl || req.url;
});

/**
 * request method
 */

morgana.token('method', function getMethodToken(req) {
  return req.method;
});

/**
 * response time in milliseconds
 */
morgana.token('response-time', function getResponseTimeToken(req, res, digits) {
  if (!req._startAt || !res._startAt) {
    // missing request and/or response start time
    return;
  }

  // calculate diff
  var ms = (res._startAt[0] - req._startAt[0]) * 1e3
    + (res._startAt[1] - req._startAt[1]) * 1e-6;

  // return truncated value
  return ms.toFixed(digits === undefined ? 3 : digits);
});

/**
 * response status code
 */
morgana.token('status', function getStatusToken(req, res) {
  return res._header
    ? String(res.statusCode)
    : undefined;
});

/**
 * normalized referrer
 */
morgana.token('referrer', function getReferrerToken(req) {
  return req.headers['referer'] || req.headers['referrer'];
});

/**
 * remote address
 */
morgana.token('remote-addr', getip);

/**
 * remote user
 */
morgana.token('remote-user', function getRemoteUserToken(req) {
  // parse basic credentials
  var credentials = auth(req);

  // return username
  return credentials
    ? credentials.name
    : undefined;
});

/**
 * HTTP version
 */
morgana.token('http-version', function getHttpVersionToken(req) {
  return req.httpVersionMajor + '.' + req.httpVersionMinor;
});

/**
 * UA string
 */
morgana.token('user-agent', function getUserAgentToken(req) {
  return req.headers['user-agent'];
});

/**
 * request header
 */
morgana.token('req', function getRequestToken(req, res, field) {
  // get header
  var header = req.headers[field.toLowerCase()];

  return Array.isArray(header)
    ? header.join(', ')
    : header;
});

/**
 * response header
 */
morgana.token('res', function getResponseTime(req, res, field) {
  if (!res._header) {
    return undefined;
  }

  // get header
  var header = res.getHeader(field);

  return Array.isArray(header)
    ? header.join(', ')
    : header;
});

/**
 * Compile a format string into a function.
 *
 * @param {string} format string representing the format of the log
 * @return {function} function to apply the format
 * @public
 */
function compile(format) {
  if (typeof format !== 'string') {
    throw new TypeError('argument format must be a string');
  }

  var fmt = format.replace(/"/g, '\\"');
  var js = '  return "' + fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g,
      function(_, name, arg) {
        return '"\n    + (tokens["' + name + '"](req, res, ' +
          String(JSON.stringify(arg)) + ') || "-") + "';
      }) + '";';

  return new Function('tokens, req, res', js);
}


/**
 * Define a format with the given name.
 *
 * @param {string} name name of the formatter to be registered
 * @param {string|function} fmt pattern to be used to format the string
 * @return {function} format function
 * @public
 */
function format(name, fmt) {
  morgana[name] = fmt;
  return this;
}

/**
 * Lookup and compile a named format function.
 *
 * @param {string} name get the format function corresponding to that name
 * @return {function} format function
 * @public
 */
function getFormatFunction(name) {
  // lookup format
  var fmt = morgana[name] || name;

  // return compiled format
  return typeof fmt !== 'function'
    ? compile(fmt)
    : fmt;
}

/**
 * Get request IP address.
 *
 * @private
 * @param {IncomingMessage} req request to get the ip from
 * @return {string} Ip address
 */
function getip(req) {
  return req.ip
    || req._remoteAddress
    || (req.connection && req.connection.remoteAddress)
    || undefined;
}

/**
 * Define a token function with the given name,
 * and callback fn(req, res).
 *
 * @param {string} name of the token to be defined
 * @param {function} fn function that defines the token
 * @return {function} function that defines the token
 * @public
 */
function token(name, fn) {
  morgana[name] = fn;
  return this;
}
