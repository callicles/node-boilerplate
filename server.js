'use strict';

const express = require('express');
const session = require('express-session');
const morgan = require('morgan');
const bunyan = require('bunyan');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const csrf = require('csurf');

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
  name: config.appName,
  level: env === ENV_ENUM.DEV ? 'debug' : 'info'
});

app.use(morgan('common'));

app.use(compression({
  threshold: config.compressionThreshold
}));

app.use(helmet());

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// cookieParser should be above session
app.use(cookieParser());
app.use(cookieSession({ secret: config.secret }));
app.use(session({
  secret: config.appName,
  proxy: true,
  resave: true,
  saveUninitialized: true
}));

// adds CSRF support
if (env !== ENV_ENUM.TEST) {
  app.use(csrf());

  // This could be moved to view-helpers :-)
  app.use(function(req, res, next) {
    res.locals.csrf_token = req.csrfToken();
    next();
  });
}

require('./src/routes')(app);

app.listen(port, function() {
  log.info('Example app listening on port ' + port + '!');
});
