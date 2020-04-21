var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var winston = require('winston');
var env = process.env.NODE_ENV || 'development';
var config = require('./config');
var moment = require('moment');
var expressValidator = require('express-validator');
var json2xls = require('json2xls');

module.exports = function(app) {
  winston.emitErrs = true;

  if (env === 'production') {

    var logger = new winston.Logger({
      transports: [
        new winston.transports.File({
          name: 'info',
          level: 'info',
          filename: config.logDir + '/info.log',
          handleExceptions: true,
          json: true,
          maxsize: 5242880, //5MB
          maxFiles: 5,
          colorize: true
        }),
        new winston.transports.File({
          name: 'error',
          level: 'error',
          filename: config.logDir + '/error.log',
          handleExceptions: true,
          json: true,
          maxsize: 5242880, //5MB
          maxFiles: 5,
          colorize: true
        }),
        new winston.transports.File({
          level: 'debug',
          filename: config.logDir + '/debug.log',
          handleExceptions: true,
          json: false,
          colorize: true
        })
      ],
      exitOnError: false
    });
  } else {
    var logger = new winston.Logger({
      transports: [
        new(winston.transports.Console)()
      ]
    });
  }



  module.exports = logger;

  module.exports.stream = {
    write: function(message, encoding) {

      logger.info(message);
    }
  };

  if (env !== 'test') {
    morgan('combined', {
      "stream": logger.stream
    });
  }
  // bodyParser should be above methodOverride
  app.use(bodyParser.urlencoded({
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
  }));

  app.use(bodyParser.json({
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
  }));

  app.use(expressValidator({
    customValidators: {
      isDate: function(value) {
        return moment(value, "DD/MM/YYYY", true).isValid();
      }
    }
  }));

  app.use(methodOverride(function(req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      var method = req.body._method;
      delete req.body._method;
      return method;
    }
  }));


  app.set('x-powered-by', false);

  app.use(json2xls.middleware);

  //CORS middleware
  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override,Authorization, Content-Type, Accept');
    if ('OPTIONS' == req.method) {
      res.send(200);
    } else {
      next();
    }
  });
};