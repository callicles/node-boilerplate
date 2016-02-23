'use strict';

const fs = require('fs');
const p = require('path');
const _ = require('lodash');

/**
 * Imports the routes from the specified path recursively
 * @param {function} app Express app
 * @param {string}   path path of the directory to index first
 * @return {void}
 */
function importRoutes(app, path) {
  let fileList = fs.readdirSync(path);

  _.forEach(fileList, function(file) {
    let newPath = path + p.sep + file;
    if (fs.statSync(newPath).isDirectory()) {
      importRoutes(newPath);
    } else {
      require('.' + p.sep + newPath.substring(newPath.indexOf(p.sep)))(app); // eslint-disable-line global-require
    }
  });
}

module.exports = function(app) {
  importRoutes(app, p.join('src', 'api'));
};
