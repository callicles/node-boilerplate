'use strict';

const express = require('express');
const bunyan = require('bunyan');
const helmet = require('helmet');

const ENV_ENUM = {
  DEV: 'development',
  PROD: 'production',
  TEST: 'test'
};

const env = process.env.NODE_ENV || ENV_ENUM.DEV;
const port = process.env.PORT || 3000;

const config = require('./config/' + env + '.js');

const app = express();
const log = bunyan.createLogger({
  name: 'myApp',
  level: env === ENV_ENUM.DEV ? 'debug' : 'info'
});

app.use(helmet());

app.listen(port, function() {
  log.info('Example app listening on port ' + port + '!');
});
